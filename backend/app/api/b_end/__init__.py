"""B 端路由聚合。"""

from fastapi import APIRouter

from app.api.b_end import (
    audit,
    auth,
    chapter,
    chart,
    novel,
    role,
    royalty,
    sensitive,
    system,
    user,
    workbench,
)

router = APIRouter()
router.include_router(auth.router, tags=["鉴权"])
router.include_router(workbench.router, tags=["工作台"])
router.include_router(novel.router, tags=["作品管理"])
router.include_router(chapter.router, tags=["章节管理"])
router.include_router(audit.router, tags=["内容审核"])
router.include_router(role.router, tags=["角色权限"])
router.include_router(royalty.router, tags=["稿费管理"])
router.include_router(sensitive.router, tags=["敏感词"])
router.include_router(chart.router, tags=["图表数据"])
router.include_router(system.router, tags=["系统设置"])
router.include_router(user.router, tags=["用户管理"])

__all__ = ["router"]
