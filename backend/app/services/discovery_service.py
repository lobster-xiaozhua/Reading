"""C 端发现页服务（§7.1）。

聚合 Banner、热门、限免、编辑推荐、排行榜、分类树、标签云，
全部走 Cache-Aside 策略，缓存命中直接返回，未命中回查库并回填。
"""

import json

import redis.asyncio as redis
import structlog
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.novel import Banner as BannerModel
from app.models.novel import Category, Novel
from app.repositories.novel_repo import NovelRepository
from app.schemas.c_end import (
    Banner,
    BookSummary,
    CategoryNode,
    DiscoverHome,
    RankItem,
    RecommendBook,
    TagItem,
)
from app.services._converters import novel_to_c_summary
from app.utils.cache import cache_get, cache_set, cache_single_flight

logger = structlog.get_logger(__name__)

# 缓存 TTL（秒）
_TTL_BANNERS = 300
_TTL_HOT_BOOKS = 300
_TTL_FREE_LIMITED = 300
_TTL_EDITOR_PICKS = 300
_TTL_RANKING = 600
_TTL_CATEGORIES = 86400
_TTL_TAGS = 86400
_TTL_HOME = 300


class DiscoveryService:
    """发现页聚合服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.novel_repo = NovelRepository(session)

    # ── 缓存预热 ─────────────────────────────────────────
    async def warmup(self) -> dict[str, int]:
        """启动时预热核心缓存，返回各模块写入条数。"""
        results: dict[str, int] = {}

        async def _warm(key: str, coro) -> int:
            try:
                count = len(await coro)
                results[key] = count
                return count
            except Exception:
                logger.warning("预热 %s 失败", key, exc_info=True)
                return 0

        await _warm("banners", self.get_banners())
        await _warm("hot_books", self.get_hot_books(10))
        await _warm("categories", self.get_categories())
        await _warm("tags", self.get_tags())
        try:
            ranks = {}
            for rank_type in ("hot", "follow", "ticket", "new"):
                ranks[rank_type] = await self.get_ranking(rank_type, 20)
            for rank_type, items in ranks.items():
                results[f"ranking:{rank_type}"] = len(items)
        except Exception:
            logger.warning("预热 rankings 失败", exc_info=True)
        logger.info("缓存预热完成", **results)
        return results

    # ── 聚合首页 ────────────────────────────────────────
    async def get_home_payload(self, rank_limit: int = 8) -> DiscoverHome:
        """聚合发现页全部模块数据，单模块失败降级为空数组。

        各模块复用既有 Cache-Aside 缓存方法；排行榜 4 路并发执行。
        """
        cached = await cache_get(self.redis, CacheKeys.HOME)
        if cached:
            try:
                return DiscoverHome.model_validate_json(cached)
            except Exception:
                logger.warning("聚合缓存解析失败，回源重建", exc_info=True)

        async def rebuild() -> DiscoverHome:
            # 等待者可能在锁释放后进入：此时缓存可能已被写入，直接复用
            cached = await cache_get(self.redis, CacheKeys.HOME)
            if cached:
                try:
                    return DiscoverHome.model_validate_json(cached)
                except Exception:
                    logger.warning("聚合缓存二次解析失败，重建", exc_info=True)

            async def safe(fn):
                try:
                    return await fn
                except Exception:
                    logger.warning("发现页模块加载失败", exc_info=True)
                    return []

            # 排行榜 4 路顺序执行（AsyncSession 不支持并发复用同一连接）
            ranks = {
                "hot": await safe(self.get_ranking("hot", rank_limit)),
                "follow": await safe(self.get_ranking("follow", rank_limit)),
                "ticket": await safe(self.get_ranking("ticket", rank_limit)),
                "new": await safe(self.get_ranking("new", rank_limit)),
            }

            payload = DiscoverHome(
                banners=await safe(self.get_banners()),
                hotBooks=await safe(self.get_hot_books(10)),
                freeBooks=await safe(self.get_free_limited_books(10)),
                editorPicks=await safe(self.get_editor_picks(6)),
                categories=await safe(self.get_categories()),
                rankings=ranks,
            )
            try:
                await self.redis.set(CacheKeys.HOME, payload.model_dump_json(), ex=_TTL_HOME)
            except Exception:
                logger.warning("聚合缓存写入失败 key=%s", CacheKeys.HOME, exc_info=True)
            return payload

        # 单飞重建：聚合成本高，避免缓存失效瞬间并发回源（防击穿）
        return await cache_single_flight(self.redis, CacheKeys.HOME_LOCK, rebuild)

    # ── Banner ──────────────────────────────────────────
    async def get_banners(self) -> list[Banner]:
        """获取 Banner 列表（Cache-Aside）。"""
        cached = await self.redis.get(CacheKeys.BANNERS)
        if cached:
            return [Banner.model_validate(b) for b in json.loads(cached)]

        banners = await self.novel_repo.get_banners()
        result = [_banner_to_schema(b) for b in banners]
        await cache_set(
            self.redis, CacheKeys.BANNERS, [b.model_dump(mode="json") for b in result], _TTL_BANNERS
        )
        return result

    # ── 热门 / 限免 / 编辑推荐 ────────────────────────────
    async def get_hot_books(self, limit: int = 6) -> list[BookSummary]:
        return await self._get_flag_books(CacheKeys.HOT_BOOKS, "hot", limit, _TTL_HOT_BOOKS)

    async def get_free_limited_books(self, limit: int = 6) -> list[BookSummary]:
        return await self._get_flag_books(
            CacheKeys.FREE_LIMITED, "free-limited", limit, _TTL_FREE_LIMITED
        )

    async def get_editor_picks(self, limit: int = 6) -> list[RecommendBook]:
        """获取编辑推荐作品列表。"""
        cached = await self.redis.get(CacheKeys.EDITOR_PICKS)
        if cached:
            return [RecommendBook.model_validate(r) for r in json.loads(cached)]

        novels = await self.novel_repo.by_flag("editor-pick", limit)
        result = [
            RecommendBook(book=novel_to_c_summary(n), match_score=_match_score(n)) for n in novels
        ]
        await cache_set(
            self.redis,
            CacheKeys.EDITOR_PICKS,
            [r.model_dump(mode="json") for r in result],
            _TTL_EDITOR_PICKS,
        )
        return result

    # ── 排行榜 ──────────────────────────────────────────
    async def get_ranking(self, rank_type: str, limit: int = 100) -> list[RankItem]:
        """获取排行榜数据。"""
        key = CacheKeys.rank(rank_type)
        cached = await self.redis.get(key)
        if cached:
            return [RankItem.model_validate(r) for r in json.loads(cached)]

        if rank_type == "hot":
            # hot 排行按点击量排序：先将 Redis 增量合并回 DB，保证排序真实
            await self._sync_click_counts()

        novels = await self.novel_repo.ranking(rank_type, limit)
        result = [
            RankItem(book=novel_to_c_summary(n), rank=i + 1, prev_rank=i + 1)
            for i, n in enumerate(novels)
        ]
        await cache_set(self.redis, key, [r.model_dump(mode="json") for r in result], _TTL_RANKING)
        return result

    async def _sync_click_counts(self) -> None:
        """将 Redis 中的点击增量合并回 DB 并清零。"""
        try:
            batch: list[str] = []
            async for key in self.redis.scan_iter(
                match=CacheKeys.BOOK_CLICK_PREFIX + "*", count=100
            ):
                batch.append(key)
                if len(batch) >= 200:
                    await self._flush_click_counts(batch)
                    batch = []
            if batch:
                await self._flush_click_counts(batch)
        except Exception:
            logger.debug("点击计数同步失败（非阻塞）", exc_info=True)

    async def _flush_click_counts(self, keys: list[str]) -> None:
        """读取一组点击键并累加到 DB，随后批量删除键，防止重复累计。"""
        if not keys:
            return
        pipe = self.redis.pipeline()
        for k in keys:
            pipe.get(k)
        values = await pipe.execute()
        to_delete: list[str] = []
        for k, v in zip(keys, values, strict=True):
            if not v:
                to_delete.append(k)
                continue
            try:
                book_id = int(k.rsplit(":", 1)[-1])
            except ValueError:
                to_delete.append(k)
                continue
            await self.session.execute(
                update(Novel)
                .where(Novel.id == book_id)
                .values(click_count=Novel.click_count + int(v))
            )
            to_delete.append(k)
        await self.session.commit()
        if to_delete:
            await self.redis.delete(*to_delete)

    # ── 分类树 ──────────────────────────────────────────
    async def get_categories(self) -> list[CategoryNode]:
        """获取分类树（一级/二级层级结构）。"""
        cached = await self.redis.get(CacheKeys.CATEGORIES)
        if cached:
            return [CategoryNode.model_validate(c) for c in json.loads(cached)]

        categories = await self.novel_repo.get_categories()
        result = _build_category_tree(categories)
        await cache_set(
            self.redis,
            CacheKeys.CATEGORIES,
            [c.model_dump(mode="json") for c in result],
            _TTL_CATEGORIES,
        )
        return result

    # ── 标签云 ──────────────────────────────────────────
    async def get_tags(self) -> list[TagItem]:
        """获取标签云数据。"""
        cached = await self.redis.get(CacheKeys.TAGS)
        if cached:
            return [TagItem.model_validate(t) for t in json.loads(cached)]

        tags = await self.novel_repo.get_tags()
        result = [TagItem(id=str(t.id), name=t.name, count=t.ref_count) for t in tags]
        await cache_set(
            self.redis, CacheKeys.TAGS, [t.model_dump(mode="json") for t in result], _TTL_TAGS
        )
        return result

    # ── 推荐书单 ─────────────────────────────────────────
    # 个性化推荐已迁移至 recommend_service.RecommendService（协同过滤 + 冷启动）

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_flag_books(
        self, cache_key: str, flag: str, limit: int, ttl: int
    ) -> list[BookSummary]:
        cached = await self.redis.get(cache_key)
        if cached:
            return [BookSummary.model_validate(b) for b in json.loads(cached)]

        novels = await self.novel_repo.by_flag(flag, limit)
        result = [novel_to_c_summary(n) for n in novels]
        await cache_set(self.redis, cache_key, [b.model_dump(mode="json") for b in result], ttl)
        return result


def _banner_to_schema(b: BannerModel) -> Banner:
    return Banner(
        id=str(b.id),
        book_id=b.book_id,
        title=b.title,
        subtitle=b.subtitle,
        cover=b.cover,
        accent=b.accent,
    )


def _build_category_tree(categories: list[Category]) -> list[CategoryNode]:
    """构建一级/二级分类树。"""
    nodes: dict[int, CategoryNode] = {
        c.id: CategoryNode(
            id=str(c.id),
            name=c.name,
            icon=c.icon,
            count=c.novel_count,
            children=[],
        )
        for c in categories
    }
    roots: list[CategoryNode] = []
    for c in categories:
        node = nodes[c.id]
        if c.parent_id and c.parent_id in nodes:
            parent = nodes[c.parent_id]
            if parent.children is None:
                parent.children = []
            parent.children.append(node)
        else:
            roots.append(node)
    # 空子节点置 None，对齐前端可选字段
    for node in roots:
        if not node.children:
            node.children = None
    return roots


def _match_score(novel: Novel) -> int:
    """根据评分与点击量估算匹配度（0-100）。"""
    score = int(min(novel.rating * 18, 90))
    if novel.click_count > 10000:
        score += 10
    return min(score, 100)
