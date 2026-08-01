"""作品仓储：小说 / 标签 / 分类 / Banner（§4.2.2）。"""

from sqlalchemy import select

from app.models.novel import Banner, Category, Novel, Tag
from app.repositories.base import BaseRepository


class NovelRepository(BaseRepository[Novel]):
    model = Novel

    async def list_published(
        self,
        *,
        category: str = "all",
        sort: str = "hot",
        status: str | None = None,
        page: int = 1,
        page_size: int = 12,
    ) -> tuple[list[Novel], int]:
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
        stmt = select(Novel).where(Novel.deleted == 0)
        if search_key:
            stmt = stmt.where(Novel.title.contains(search_key))
        if status and status != "all":
            stmt = stmt.where(Novel.status == status)
        if category and category != "all":
            stmt = stmt.where(Novel.category == category)
        if date_range and len(date_range) == 2:
            stmt = stmt.where(
                Novel.updated_at >= date_range[0], Novel.updated_at <= date_range[1]
            )
        stmt = stmt.order_by(Novel.updated_at.desc())
        return await self.paginate(stmt, page, page_size)

    async def by_flag(self, flag: str, limit: int = 6) -> list[Novel]:
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
        order = {
            "hot": Novel.click_count.desc(),
            "follow": Novel.follow_count.desc(),
            "ticket": Novel.follow_count.desc(),
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
        stmt = (
            select(Novel)
            .where(
                Novel.deleted == 0,
                Novel.status == "published",
                Novel.title.contains(keyword),
            )
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_categories(self) -> list[Category]:
        result = await self.session.execute(select(Category).order_by(Category.sort))
        return list(result.scalars().all())

    async def get_tags(self) -> list[Tag]:
        result = await self.session.execute(
            select(Tag).order_by(Tag.ref_count.desc())
        )
        return list(result.scalars().all())

    async def get_banners(self) -> list[Banner]:
        result = await self.session.execute(select(Banner).order_by(Banner.sort))
        return list(result.scalars().all())
