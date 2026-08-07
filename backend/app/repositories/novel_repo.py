"""作品仓储：小说 / 标签 / 分类 / Banner（§4.2.2）。"""

from sqlalchemy import select

from app.core.config import settings
from app.models.novel import Banner, Category, Novel, Tag
from app.repositories.base import BaseRepository, split_csv


class NovelRepository(BaseRepository[Novel]):
    model = Novel

    async def list_published(
        self,
        *,
        category: str = "all",
        sort: str = "hot",
        status: str | None = None,
        tags: str | None = None,
        page: int = 1,
        page_size: int = 12,
    ) -> tuple[list[Novel], int]:
        """分页查询已发布作品，支持分类/排序/状态/标签筛选。"""
        sort_field = {
            "hot": Novel.click_count.desc(),
            "follow": Novel.follow_count.desc(),
            "latest": Novel.updated_at.desc(),
            "completed": Novel.published_at.desc(),
        }.get(sort, Novel.click_count.desc())

        stmt = select(Novel).where(Novel.deleted == 0, Novel.status == "published")
        if category and category != "all":
            stmt = stmt.where(Novel.category == category)
        if status == "completed" or sort == "completed":
            stmt = stmt.where(Novel.is_completed == 1)
        if tags:
            for tag in tags.split(","):
                tag = tag.strip()
                if tag:
                    like_tag = f"%{tag}%"
                    stmt = stmt.where(Novel.tags_str.like(like_tag))
        stmt = stmt.order_by(sort_field)
        return await self.paginate(stmt, page, page_size)

    async def list_for_b_end(
        self,
        *,
        search_key: str = "",
        status: str = "all",
        category: str = "all",
        date_range: list[int] | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Novel], int]:
        """B 端分页查询作品列表，支持搜索/状态/分类/时间范围筛选。"""
        stmt = select(Novel).where(Novel.deleted == 0)
        if search_key:
            stmt = stmt.where(Novel.title.contains(search_key))
        if status and status != "all":
            stmt = stmt.where(Novel.status.in_(split_csv(status)))
        if category and category != "all":
            stmt = stmt.where(Novel.category.in_(split_csv(category)))
        if date_range and len(date_range) == 2:
            stmt = stmt.where(Novel.updated_at >= date_range[0], Novel.updated_at <= date_range[1])
        stmt = stmt.order_by(Novel.updated_at.desc())
        return await self.paginate(stmt, page, page_size)

    async def by_flag(self, flag: str, limit: int = 6) -> list[Novel]:
        """根据标记位查询已发布作品，按评分降序排列。"""
        stmt = (
            select(Novel)
            .where(
                Novel.deleted == 0,
                Novel.status == "published",
                Novel.flags.contains(flag),
            )
            .order_by(Novel.rating.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def ranking(self, rank_type: str, limit: int = 100) -> list[Novel]:
        """获取排行榜作品列表，支持 hot/follow/ticket/new 维度。"""
        order = {
            "hot": Novel.click_count.desc(),
            "follow": Novel.follow_count.desc(),
            "ticket": (Novel.follow_count + Novel.rating_count).desc(),
            "new": Novel.published_at.desc(),
        }.get(rank_type, Novel.click_count.desc())
        stmt = (
            select(Novel)
            .where(Novel.deleted == 0, Novel.status == "published")
            .order_by(order)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def search(self, keyword: str, limit: int = 20) -> list[Novel]:
        """根据标题关键词搜索已发布作品。

        MySQL 使用 FULLTEXT MATCH...AGAINST（走 idx_novels_title_author_ft），
        SQLite 回退 LIKE 模糊匹配。
        """
        from sqlalchemy import text

        base = select(Novel).where(Novel.deleted == 0, Novel.status == "published")
        if settings.db_url.startswith("mysql"):
            # FULLTEXT 检索：标题+作者
            match_expr = text(
                "MATCH(title, author_name) AGAINST (:kw IN BOOLEAN MODE)"
            )
            stmt = base.where(match_expr.bindparams(kw=keyword)).order_by(
                text("MATCH(title, author_name) AGAINST (:kw2 IN BOOLEAN MODE) DESC").bindparams(kw2=keyword)
            )
        else:
            stmt = base.where(Novel.title.contains(keyword))
        result = await self.session.execute(stmt.limit(limit))
        return list(result.scalars().all())

    async def get_categories(self) -> list[Category]:
        """获取全部分类，按排序字段升序排列。"""
        result = await self.session.execute(select(Category).order_by(Category.sort))
        return list(result.scalars().all())

    async def get_tags(self) -> list[Tag]:
        """获取全部标签，按引用次数降序排列。"""
        result = await self.session.execute(select(Tag).order_by(Tag.ref_count.desc()))
        return list(result.scalars().all())

    async def get_banners(self) -> list[Banner]:
        """获取全部 Banner，按排序字段升序排列。"""
        result = await self.session.execute(select(Banner).order_by(Banner.sort))
        return list(result.scalars().all())
