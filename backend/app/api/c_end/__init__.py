"""C 端路由聚合。"""

from fastapi import APIRouter

from app.api.c_end import auth, book, discovery, interaction, notes, search, user_center

router = APIRouter()
router.include_router(auth.router)
router.include_router(discovery.router, tags=["发现页"])
router.include_router(book.router, tags=["书籍"])
router.include_router(search.router, tags=["搜索"])
router.include_router(user_center.router, tags=["用户中心"])
router.include_router(interaction.router, tags=["互动"])
router.include_router(notes.router, tags=["笔记"])

__all__ = ["router"]
