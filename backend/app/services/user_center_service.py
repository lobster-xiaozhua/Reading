"""C 端用户中心服务（§7.5）。

提供个人信息、书架、阅读历史、打赏记录、阅读统计、热力图、
阅读偏好、徽章、VIP 套餐、支付方式、追更列表。
"""

import json
import math
from datetime import date, timedelta

import redis.asyncio as redis
import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.novel import Chapter, Novel
from app.models.reading import Bookshelf, ReadingStatsDaily
from app.models.user import Reader
from app.repositories.chapter_repo import ChapterRepository
from app.repositories.novel_repo import NovelRepository
from app.repositories.reader_repo import (
    BookshelfRepository,
    ReadingHistoryRepository,
    ReadingStatsRepository,
)
from app.schemas.c_end import (
    Badge,
    BookshelfItem,
    FollowItem,
    HeatmapCell,
    PaymentMethodItem,
    PreferenceItem,
    ReadingHistoryItem,
    ReadingStatOverview,
    RewardRecord,
    UserProfile,
    UserProfileStats,
    VipPlan,
)
from app.schemas.enums import FollowStatus
from app.services._converters import novel_to_c_summary
from app.utils.cache import cache_set

logger = structlog.get_logger(__name__)

_TTL_HEATMAP = 3600


class UserCenterService:
    """C 端个人中心服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.novel_repo = NovelRepository(session)
        self.chapter_repo = ChapterRepository(session)
        self.shelf_repo = BookshelfRepository(session)
        self.history_repo = ReadingHistoryRepository(session)
        self.stats_repo = ReadingStatsRepository(session)

    # ── 个人信息 ─────────────────────────────────────────
    async def get_profile(self, reader_id: int) -> UserProfile:
        """获取读者个人信息及阅读统计。

        Args:
            reader_id: 读者 ID。

        Returns:
            用户个人资料。
        """
        reader = await self.session.get(Reader, reader_id)
        if not reader:
            return UserProfile(id=str(reader_id), nickname="游客")

        overview = await self.stats_repo.get_overview(reader_id)
        shelf_count = await self._count_shelf(reader_id)
        stats = UserProfileStats(
            reading_days=overview.get("reading_days", 0),
            reading_minutes=overview.get("total_reading_minutes", 0),
            read_words=overview.get("total_read_words", 0),
            bookshelf_count=shelf_count,
        )
        return UserProfile(
            id=str(reader.id),
            nickname=reader.nickname or reader.username,
            avatar=reader.avatar,
            level=reader.level,
            is_vip=bool(reader.is_vip),
            vip_expire_at=reader.vip_expire_at or None,
            stats=stats,
        )

    # ── 书架 ──────────────────────────────────────────
    async def get_bookshelf(self, reader_id: int, tab: str = "all") -> list[BookshelfItem]:
        """获取读者书架列表。

        Args:
            reader_id: 读者 ID。
            tab: 筛选标签（all/ongoing/completed/recent）。

        Returns:
            书架列表。
        """
        shelves = await self.shelf_repo.list_by_reader(reader_id, limit=200)
        if not shelves:
            return []

        novel_ids = [s.novel_id for s in shelves]
        novels = await self._get_novels_by_ids(novel_ids)
        novel_map = {n.id: n for n in novels}

        items: list[BookshelfItem] = []
        filtered = [
            s for s in shelves
            if (s.novel_id in novel_map)
            and not (tab == "ongoing" and novel_map[s.novel_id].is_completed)
            and not (tab == "completed" and not novel_map[s.novel_id].is_completed)
        ]
        filtered_ids = [s.novel_id for s in filtered]
        history_map = await self.history_repo.get_by_reader_novels(reader_id, filtered_ids)
        for s in filtered:
            novel = novel_map[s.novel_id]
            history = history_map.get(s.novel_id)
            items.append(
                BookshelfItem(
                    book=novel_to_c_summary(novel),
                    added_at=s.added_at,
                    last_read_chapter_index=history.chapter_index if history else 0,
                    percent=float(history.percent) if history else 0.0,
                )
            )
        if tab == "recent":
            items.sort(key=lambda x: x.percent, reverse=True)
        return items

    # ── 阅读历史 ─────────────────────────────────────────
    async def get_reading_history(
        self, reader_id: int, limit: int = 20
    ) -> list[ReadingHistoryItem]:
        """获取阅读历史记录。

        Args:
            reader_id: 读者 ID。
            limit: 数量限制。

        Returns:
            阅读历史列表。
        """
        histories = await self.history_repo.list_by_reader(reader_id, limit)
        if not histories:
            return []
        novel_ids = [h.novel_id for h in histories]
        novels = await self._get_novels_by_ids(novel_ids)
        novel_map = {n.id: n for n in novels}

        chapter_ids = [h.chapter_id for h in histories if h.chapter_id]
        chapters = {}
        if chapter_ids:
            from sqlalchemy import select as sa_select
            stmt = sa_select(Chapter).where(Chapter.id.in_(chapter_ids))
            rows = (await self.session.execute(stmt)).scalars().all()
            chapters = {c.id: c for c in rows}

        result: list[ReadingHistoryItem] = []
        for h in histories:
            novel = novel_map.get(h.novel_id)
            if not novel:
                continue
            chapter = chapters.get(h.chapter_id) if h.chapter_id else None
            result.append(
                ReadingHistoryItem(
                    book_id=str(novel.id),
                    book=novel_to_c_summary(novel),
                    chapter_id=str(h.chapter_id),
                    chapter_title=chapter.title if chapter else "",
                    chapter_index=h.chapter_index,
                    percent=float(h.percent),
                    read_at=h.read_at,
                )
            )
        return result

    # ── 打赏记录 ─────────────────────────────────────────
    async def get_reward_records(self, reader_id: int, limit: int = 20) -> list[RewardRecord]:
        """获取打赏记录。

        Args:
            reader_id: 读者 ID。
            limit: 数量限制。

        Returns:
            打赏记录列表。
        """
        from app.models.interaction import RewardRecord as RewardModel

        stmt = (
            select(RewardModel, Novel.title)
            .join(Novel, RewardModel.novel_id == Novel.id)
            .where(RewardModel.reader_id == reader_id)
            .order_by(RewardModel.created_at.desc())
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).all()
        return [
            RewardRecord(
                id=str(r.id),
                book_id=str(r.novel_id),
                book_title=title or "",
                type=r.type,
                amount=r.amount,
                created_at=r.created_at,
            )
            for r, title in rows
        ]

    # ── 阅读统计概览 ───────────────────────────────────────
    async def get_stats_overview(self, reader_id: int) -> ReadingStatOverview:
        """获取阅读统计概览（本周时长、总字数、连续阅读天数）。

        Args:
            reader_id: 读者 ID。

        Returns:
            阅读统计概览。
        """
        overview = await self.stats_repo.get_overview(reader_id)
        streak = await self.stats_repo.get_current_streak(reader_id)
        # 本周阅读时长
        week_start = date.today() - timedelta(days=date.today().weekday())
        weekly_stmt = select(func.sum(ReadingStatsDaily.duration_minutes)).where(
            ReadingStatsDaily.reader_id == reader_id,
            ReadingStatsDaily.stat_date >= week_start,
        )
        weekly = (await self.session.execute(weekly_stmt)).scalar_one()
        return ReadingStatOverview(
            weekly_duration=weekly or 0,
            total_words=overview.get("total_read_words", 0),
            streak_days=streak,
            total_reading_minutes=overview.get("total_reading_minutes", 0),
            total_read_words=overview.get("total_read_words", 0),
            reading_days=overview.get("reading_days", 0),
            current_streak=streak,
            longest_streak=streak,
        )

    # ── 热力图 ──────────────────────────────────────────
    async def get_heatmap(self, reader_id: int, days: int = 365) -> list[HeatmapCell]:
        """获取阅读热力图数据（Cache-Aside）。

        Args:
            reader_id: 读者 ID。
            days: 统计天数。

        Returns:
            热力图数据列表。
        """
        cached = await self.redis.get(CacheKeys.heatmap(reader_id))
        if cached:
            return [HeatmapCell.model_validate(c) for c in json.loads(cached)]

        stats = await self.stats_repo.get_heatmap(reader_id, days)
        result = [
            HeatmapCell(date=s.stat_date.isoformat(), duration=s.duration_minutes) for s in stats
        ]
        await cache_set(self.redis, CacheKeys.heatmap(reader_id), result, _TTL_HEATMAP)
        return result

    # ── 阅读偏好 ─────────────────────────────────────────
    async def get_preferences(self, reader_id: int) -> list[PreferenceItem]:
        """获取阅读偏好（按分类统计阅读占比）。

        Args:
            reader_id: 读者 ID。

        Returns:
            阅读偏好列表。
        """
        stmt = (
            select(Novel.category, func.sum(ReadingStatsDaily.words))
            .join(Novel, ReadingStatsDaily.reader_id == Novel.author_id)
            .where(ReadingStatsDaily.reader_id == reader_id)
            .group_by(Novel.category)
        )
        rows = (await self.session.execute(stmt)).all()
        total = sum(r[1] or 0 for r in rows)
        return [
            PreferenceItem(
                category=cat,
                percent=round((words or 0) / total * 100, 1) if total else 0.0,
                words=words or 0,
            )
            for cat, words in rows
        ]

    # ── 徽章 ──────────────────────────────────────────
    async def get_badges(self, reader_id: int) -> list[Badge]:
        """获取读者徽章列表（基于阅读统计计算）。

        Args:
            reader_id: 读者 ID。

        Returns:
            徽章列表。
        """
        overview = await self.stats_repo.get_overview(reader_id)
        return _build_badges(overview)

    # ── VIP 套餐 ─────────────────────────────────────────
    async def get_vip_plans(self) -> list[VipPlan]:
        """获取 VIP 套餐列表。"""
        return _default_vip_plans()

    # ── 支付方式 ─────────────────────────────────────────
    async def get_payment_methods(self) -> list[PaymentMethodItem]:
        """获取支付方式列表。"""
        return _default_payment_methods()

    # ── 追更列表 ─────────────────────────────────────────
    async def get_follow_list(self, reader_id: int) -> list[FollowItem]:
        """获取追更列表（含更新状态标记）。

        Args:
            reader_id: 读者 ID。

        Returns:
            追更列表。
        """
        shelves = await self.shelf_repo.list_by_reader(reader_id, limit=200)
        if not shelves:
            return []
        novel_ids = [s.novel_id for s in shelves]
        novels = await self._get_novels_by_ids(novel_ids)
        novel_map = {n.id: n for n in novels}

        novel_ids = [s.novel_id for s in shelves if s.novel_id in novel_map]
        latest_map = await self.chapter_repo.get_latest_batch(novel_ids)
        history_map = await self.history_repo.get_by_reader_novels(reader_id, novel_ids)

        result: list[FollowItem] = []
        for s in shelves:
            novel = novel_map.get(s.novel_id)
            if not novel:
                continue
            latest = latest_map.get(novel.id)
            history = history_map.get(s.novel_id)
            status = FollowStatus.NONE
            if latest and history:
                if latest.index > history.chapter_index:
                    status = FollowStatus.UPDATED
                elif novel.is_completed:
                    status = FollowStatus.DONE
            elif novel.is_completed:
                status = FollowStatus.DONE
            result.append(
                FollowItem(
                    book_id=str(novel.id),
                    cover=novel.cover,
                    title=novel.title,
                    latest_chapter_title=latest.title if latest else "",
                    latest_time=latest.published_at if latest else 0,
                    status=status,
                    unread_count=0,
                    finished=bool(novel.is_completed),
                )
            )
        return result

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_novels_by_ids(self, novel_ids: list[int]) -> list[Novel]:
        if not novel_ids:
            return []
        stmt = select(Novel).where(
            Novel.id.in_(novel_ids), Novel.deleted == 0, Novel.status == "published"
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def _count_shelf(self, reader_id: int) -> int:
        stmt = select(func.count()).where(Bookshelf.reader_id == reader_id)
        return (await self.session.execute(stmt)).scalar_one()


def _build_badges(overview: dict) -> list[Badge]:
    """根据阅读统计生成徽章。"""
    days = overview.get("reading_days", 0)
    minutes = overview.get("total_reading_minutes", 0)
    words = overview.get("total_read_words", 0)
    return [
        Badge(
            id="reading-starter",
            name="阅读新秀",
            desc="累计阅读 7 天",
            icon="star",
            unlocked=days >= 7,
            progress=min(days, 7),
            threshold=7,
        ),
        Badge(
            id="reading-master",
            name="阅读达人",
            desc="累计阅读 30 天",
            icon="medal",
            unlocked=days >= 30,
            progress=min(days, 30),
            threshold=30,
        ),
        Badge(
            id="bookworm",
            name="书虫",
            desc="累计阅读 100 万字",
            icon="book",
            unlocked=words >= 1_000_000,
            progress=min(math.ceil(words / 10000), 100),
            threshold=100,
        ),
        Badge(
            id="marathon",
            name="阅读马拉松",
            desc="累计阅读 1000 分钟",
            icon="trophy",
            unlocked=minutes >= 1000,
            progress=min(minutes, 1000),
            threshold=1000,
        ),
    ]


def _default_vip_plans() -> list[VipPlan]:
    """默认 VIP 套餐（对齐前端 mock）。"""
    return [
        VipPlan(
            id="monthly",
            name="月度会员",
            price_per_month=15.0,
            original_price=20.0,
            total_price=15.0,
            discount="9.0折",
        ),
        VipPlan(
            id="quarterly",
            name="季度会员",
            price_per_month=12.0,
            original_price=20.0,
            total_price=36.0,
            discount="8.0折",
            recommended=True,
        ),
        VipPlan(
            id="yearly",
            name="年度会员",
            price_per_month=8.0,
            original_price=20.0,
            total_price=96.0,
            discount="6.0折",
        ),
    ]


def _default_payment_methods() -> list[PaymentMethodItem]:
    return [
        PaymentMethodItem(id="alipay", name="支付宝", icon="alipay"),
        PaymentMethodItem(id="wechat", name="微信支付", icon="wechat"),
        PaymentMethodItem(id="balance", name="余额支付", icon="wallet"),
    ]
