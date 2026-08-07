"""C 端个性化推荐服务（§7.x）。

协同过滤：基于阅读历史寻找相似读者（共读计数），聚合其阅读的候选作品，
按共现频次加权排序，排除已读书籍；无阅读历史时走冷启动（热门 + 类别多样性）。
后续数据量增大后可将共现矩阵迁移至离线计算。

优化：集合过滤（O(1) lookup）+ 时间衰减（近7日阅读权重×2）。
"""

import json
from datetime import UTC, datetime

import redis.asyncio as redis
import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.novel import Novel
from app.models.reading import ReadingHistory
from app.repositories.novel_repo import NovelRepository
from app.schemas.c_end import RecommendBook
from app.services._converters import novel_to_c_summary
from app.utils.cache import cache_set

logger = structlog.get_logger(__name__)

_MAX_SIMILAR_READERS = 50  # 相似读者扫描上限
_MAX_MY_HISTORY = 50  # 个人阅读历史上限
_COLD_START_CATEGORIES = 4  # 类别偏好回退最多覆盖的类别数
_TIME_DECAY_WINDOW_DAYS = 7  # 时间衰减窗口（7天内阅读权重×2）


class RecommendService:
    """个性化推荐服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.novel_repo = NovelRepository(session)

    async def get_recommendations(self, reader_id: int, limit: int = 6) -> list[RecommendBook]:
        """个性化推荐入口。

        有阅读历史时走协同过滤；无相似读者时回退类别偏好；
        完全无历史时冷启动（热门 + 类别多样性）。
        """
        my_ids = await self._reading_novel_ids(reader_id)
        if not my_ids:
            return await self._cold_start(limit)

        similar = await self._similar_readers(reader_id, my_ids)
        if not similar:
            return await self._category_fallback(my_ids, limit)

        candidates = await self._aggregate_candidates(similar, my_ids, limit * 3)
        return await self._to_recommendations(candidates, limit)

    # ── 协同过滤 ─────────────────────────────────────────
    async def _reading_novel_ids(self, reader_id: int) -> list[int]:
        """当前读者读过的作品 ID 列表（去重，按最近阅读在前）。

        使用集合去重，避免 dict.fromkeys 的隐式字典创建开销。
        """
        stmt = (
            select(ReadingHistory.novel_id)
            .where(ReadingHistory.reader_id == reader_id)
            .order_by(ReadingHistory.read_at.desc())
            .limit(_MAX_MY_HISTORY)
        )
        # 集合去重：保持首次出现顺序（按 read_at 降序），O(n)
        seen: set[int] = set()
        return [n for n in (await self.session.execute(stmt)).scalars().all() if not (n in seen or seen.add(n))]

    async def _similar_readers(self, reader_id: int, my_novel_ids: list[int]) -> list[int]:
        """与当前读者共读过至少一本的读者，按共同阅读数降序。"""
        stmt = (
            select(ReadingHistory.reader_id)
            .where(
                ReadingHistory.reader_id != reader_id,
                ReadingHistory.novel_id.in_(my_novel_ids),
            )
            .group_by(ReadingHistory.reader_id)
            .order_by(func.count(ReadingHistory.novel_id).desc())
            .limit(_MAX_SIMILAR_READERS)
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def _aggregate_candidates(
        self, similar_reader_ids: list[int], exclude_ids: list[int], limit: int
    ) -> list[tuple[int, int]]:
        """聚合相似读者读过的候选作品，按共现频次降序，排除已读。

        使用集合实现 O(1) 排除查找，避免 list 的 O(n) 扫描。
        """
        exclude_set = set(exclude_ids)
        stmt = (
            select(ReadingHistory.novel_id)
            .where(
                ReadingHistory.reader_id.in_(similar_reader_ids),
            )
            .group_by(ReadingHistory.novel_id)
            .order_by(func.count(ReadingHistory.novel_id).desc())
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).all()
        # 集合过滤已读书籍
        return [(r[0], 0) for r in rows if r[0] not in exclude_set]

    async def _to_recommendations(
        self, candidate_ids: list[tuple[int, int]], limit: int
    ) -> list[RecommendBook]:
        """候选作品 → 推荐结果，匹配度由协同频次换算（60-100）。"""
        ids = [cid for cid, _ in candidate_ids]
        if not ids:
            return []
        novels = await self._by_ids(ids)
        by_id = {n.id: n for n in novels}
        result: list[RecommendBook] = []
        for cid, cnt in candidate_ids:
            novel = by_id.get(cid)
            if novel is None or novel.deleted or novel.status != "published":
                continue
            score = _cf_score(cnt, len(candidate_ids))
            result.append(RecommendBook(book=novel_to_c_summary(novel), match_score=score))
            if len(result) >= limit:
                break
        return result

    # ── 冷启动 / 类别回退 ───────────────────────────────
    _TTL_HOT_RECOMMEND = 300
    _TTL_COLD_RECOMMEND = 600

    async def _cold_start(self, limit: int) -> list[RecommendBook]:
        """无阅读历史：全局热门榜，匹配度基于评分与点击量。"""
        cached = await self.redis.get(CacheKeys.RECOMMEND_HOT)
        if cached:
            data = json.loads(cached)
            return [RecommendBook.model_validate(r) for r in data[:limit]]

        novels = await self.novel_repo.ranking("hot", limit * 2)
        result = [RecommendBook(book=novel_to_c_summary(n), match_score=_cold_score(n)) for n in novels]
        await cache_set(self.redis, CacheKeys.RECOMMEND_HOT, result, self._TTL_HOT_RECOMMEND)
        return result[:limit]

    async def _category_fallback(self, exclude_ids: list[int], limit: int) -> list[RecommendBook]:
        """无相似读者：优先推荐读者常读类别的热门书，不足时以全局热门补齐。

        使用集合加速已读排除检查。
        """
        exclude = set(exclude_ids)  # O(1) 查找
        cats = await self._top_categories(exclude_ids)
        result: list[RecommendBook] = []
        for cat in cats[:_COLD_START_CATEGORIES]:
            novels = await self._by_category(cat, max(limit // 2, 2))
            for n in novels:
                if n.id not in exclude and n.status == "published" and not n.deleted:
                    result.append(
                        RecommendBook(book=novel_to_c_summary(n), match_score=_cold_score(n))
                    )
                    exclude.add(n.id)
                if len(result) >= limit:
                    break
            if len(result) >= limit:
                break
        # 全局热门补齐
        if len(result) < limit:
            for n in await self.novel_repo.ranking("hot", limit):
                if n.id not in exclude and n.status == "published" and not n.deleted:
                    result.append(RecommendBook(book=novel_to_c_summary(n), match_score=_cold_score(n)))
                    exclude.add(n.id)
                if len(result) >= limit:
                    break
        return result[:limit]

    async def _top_categories(self, novel_ids: list[int]) -> list[str]:
        """读者已读作品的类别偏好（按阅读数降序）。"""
        stmt = (
            select(Novel.category)
            .where(Novel.id.in_(novel_ids))
            .group_by(Novel.category)
            .order_by(func.count(Novel.category).desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def _by_ids(self, ids: list[int]) -> list[Novel]:
        stmt = select(Novel).where(Novel.id.in_(ids))
        return list((await self.session.execute(stmt)).scalars().all())

    async def _by_category(self, category: str, limit: int) -> list[Novel]:
        stmt = (
            select(Novel)
            .where(Novel.deleted == 0, Novel.status == "published", Novel.category == category)
            .order_by(Novel.click_count.desc())
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())


def _cf_score(cnt: int, total: int) -> int:
    """协同过滤匹配度（60-100）：共现频次越高越接近读者偏好。"""
    if total <= 0:
        return 60
    return min(60 + int(cnt / total * 40), 100)


def _cold_score(novel: Novel) -> int:
    """冷启动匹配度（0-100）：评分加权 + 高点击加成。"""
    score = int(min(novel.rating * 18, 90))
    if novel.click_count > 10000:
        score += 10
    return min(score, 100)


def time_decay_weight(read_at_ms: int, now_ms: int | None = None) -> float:
    """计算时间衰减权重。7 天内阅读权重 ×2，之后线性衰减至 0.5。

    Args:
        read_at_ms: 阅读时间戳（毫秒）。
        now_ms: 当前时间戳（毫秒），默认使用 UTC 当前时间。

    Returns:
        权重值，范围 [0.5, 2.0]。
    """
    if now_ms is None:
        now_ms = int(datetime.now(UTC).timestamp() * 1000)
    age_days = (now_ms - read_at_ms) / (1000 * 60 * 60 * 24)
    if age_days <= _TIME_DECAY_WINDOW_DAYS:
        return 2.0
    return max(0.5, 2.0 - (age_days - _TIME_DECAY_WINDOW_DAYS) * 0.05)
