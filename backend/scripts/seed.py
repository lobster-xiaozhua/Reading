"""开发环境种子数据脚本。

幂等：已存在的数据不重复写入。
用法：cd backend && python -m scripts.seed
覆盖：权限点 / 角色 / 管理员账号 / 敏感词库 / 分类 / 作者 / 作品 / 章节 / 稿费明细
"""

import asyncio
import random
import time
from datetime import date, timedelta

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models import Base
from app.models.audit import SensitiveWord
from app.models.novel import Banner, Category, Chapter, Novel, Tag
from app.models.permission import Permission, Role, RolePermission
from app.models.reading import Bookshelf, ReadingHistory
from app.models.royalty import RoyaltyDetail
from app.models.user import Admin, Author, Reader
from app.schemas.enums import ALL_PERMISSIONS, BUILTIN_ROLE_PERMISSIONS

PERMISSIONS: list[tuple[str, str, str, str]] = [
    ("novel.list", "查看作品列表", "novel", "访问作品管理列表页"),
    ("novel.create", "新建作品", "novel", "创建新作品"),
    ("novel.edit", "编辑作品", "novel", "修改作品基本信息"),
    ("novel.delete", "删除作品", "novel", "永久删除作品（高危）"),
    ("novel.shelve", "作品上下架", "novel", "控制作品在 C 端可见性"),
    ("chapter.list", "查看章节列表", "chapter", "访问章节管理"),
    ("chapter.create", "新建章节", "chapter", "创建新章节"),
    ("chapter.edit", "编辑章节", "chapter", "含拖拽排序与行内编辑"),
    ("chapter.delete", "删除章节", "chapter", "已发布章节需标题匹配"),
    ("audit.list", "查看审核队列", "audit", "访问审核工作台"),
    ("audit.approve", "审核通过", "audit", "通过/待修改"),
    ("audit.reject", "审核驳回", "audit", "驳回并退回作者"),
    ("author.list", "查看作者列表", "author", "访问作者管理"),
    ("author.edit", "编辑作者", "author", "修改作者资料与签约状态"),
    ("royalty.list", "查看稿费", "royalty", "访问稿费管理"),
    ("royalty.export", "导出稿费", "royalty", "导出 Excel/PDF"),
    ("user.list", "查看用户列表", "user", "访问用户管理"),
    ("user.edit", "编辑用户", "user", "封禁/解封/调整等级"),
    ("permission.assign", "分配权限", "permission", "为角色分配权限点"),
    ("system.config", "系统配置", "system", "站点/敏感词库等配置"),
]

ROLES: list[tuple[str, str, str, str, int]] = [
    ("super-admin", "超级管理员", "拥有系统全部权限", "all", 1),
    ("content-admin", "内容管理员", "负责作品、章节、审核、作者管理", "department", 1),
    ("operation-admin", "运营管理员", "负责上下架、稿费、用户与系统配置", "department", 1),
    ("finance-admin", "财务管理员", "负责稿费结算与导出", "department", 1),
    ("auditor", "审核员", "负责内容审核队列", "self", 1),
]

SENSITIVE_WORDS: list[tuple[str, int, str]] = [
    ("违禁药品", 1, "涉政敏感词，建议删除或替换为「丹药」"),
    ("神秘组织", 1, "涉政敏感词，建议替换为「帮派」或「门派」"),
    ("反动", 1, "涉政敏感词，禁止发布"),
    ("色情", 1, "涉黄敏感词，禁止发布"),
    ("毒酒", 2, "暴力元素，建议弱化描写"),
    ("血液染红", 2, "暴力描写，建议改为「汗水湿透」"),
    ("加微信", 2, "广告引流，建议删除"),
    ("QQ群", 2, "广告引流，建议删除"),
    ("敌军压境", 3, "可人工判断，建议保留但留意上下文"),
    ("该死", 3, "俗语，建议自查上下文"),
    ("见鬼", 3, "敏感谐音，建议自查"),
]

CATEGORIES: list[tuple[str, str, int]] = [
    ("xuanhuan", "玄幻", 1),
    ("xianxia", "仙侠", 2),
    ("scifi", "科幻", 3),
    ("romance", "言情", 4),
    ("urban", "都市", 5),
]

NOVELS: list[tuple[str, str, str, str, int]] = [
    ("斗破苍穹", "天蚕土豆", "xuanhuan", "buyout", 50),
    ("凡人修仙传", "忘语", "xianxia", "share", 60),
    ("遮天", "辰东", "xianxia", "guarantee-share", 50),
    ("诡秘之主", "爱潜水的乌贼", "fantasy", "share", 70),
    ("大奉打更人", "卖报小郎君", "xuanhuan", "buyout", 45),
]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ── 权限点 ─────────────────────────────
        for key, label, module, desc in PERMISSIONS:
            if not await db.get(Permission, key):
                db.add(Permission(perm_key=key, label=label, module=module, description=desc))

        # ── 角色 + 角色-权限 ─────────────────────
        for key, name, desc, scope, builtin in ROLES:
            if not await db.get(Role, key):
                db.add(Role(role_key=key, name=name, description=desc, data_scope=scope, builtin=builtin, user_count=0))
            existing = (
                await db.execute(select(RolePermission.perm_key).where(RolePermission.role_key == key))
            ).scalars().all()
            for p in BUILTIN_ROLE_PERMISSIONS[key]:
                if p not in existing:
                    db.add(RolePermission(role_key=key, perm_key=p))

        # ── 管理员账号 admin / admin123 ───────────
        admin = (
            await db.execute(select(Admin).where(Admin.username == "admin"))
        ).scalars().first()
        if not admin:
            db.add(
                Admin(
                    username="admin",
                    nickname="演示管理员",
                    email="admin@novel.dev",
                    password_hash=hash_password("admin123"),
                    enabled=1,
                )
            )

        # ── 读者账号 reader / reader123 ────────────
        reader = (
            await db.execute(select(Reader).where(Reader.username == "reader"))
        ).scalars().first()
        if not reader:
            db.add(
                Reader(
                    username="reader",
                    nickname="演示读者",
                    password_hash=hash_password("reader123"),
                    level=1,
                    is_vip=0,
                )
            )
            db.add(
                Reader(
                    username="vip",
                    nickname="VIP 读者",
                    password_hash=hash_password("reader123"),
                    level=3,
                    is_vip=1,
                    vip_expire_at=int(time.time() * 1000) + 365 * 86400000,
                )
            )

        # ── Banner ────────────────────────────────
        if not (await db.execute(select(Banner).limit(1))).scalars().first():
            now = int(time.time() * 1000)
            for i in range(3):
                db.add(Banner(
                    title=f"推荐专题 {i + 1}",
                    subtitle=f"热门小说推荐 {i + 1}",
                    cover="",
                    sort=i + 1,
                    created_at=now,
                ))

        # ── 标签 ──────────────────────────────────
        if not (await db.execute(select(Tag).limit(1))).scalars().first():
            for name in ("热血", "玄幻", "仙侠", "都市", "悬疑", "轻松", "搞笑", "穿越", "重生", "系统流"):
                db.add(Tag(name=name))

        # ── 敏感词库 ────────────────────────────
        version = date.today().isoformat()
        for text, level, suggestion in SENSITIVE_WORDS:
            exists = (
                await db.execute(
                    select(SensitiveWord).where(
                        SensitiveWord.text == text, SensitiveWord.level == level
                    )
                )
            ).scalars().first()
            if not exists:
                db.add(SensitiveWord(text=text, level=level, suggestion=suggestion, lib_version=version))

        # ── 分类 ───────────────────────────────
        for code, name, sort in CATEGORIES:
            exists = (
                await db.execute(select(Category).where(Category.code == code))
            ).scalars().first()
            if not exists:
                db.add(Category(code=code, name=name, sort=sort, novel_count=0))

        # ── 内容域（作者/作品/章节/稿费）──────────
        if not (await db.execute(select(Author).limit(1))).scalars().first():
            await seed_content(db)

        # ── 互动数据（评论/书架/阅读历史）─────────
        from app.models.interaction import Comment, RewardRecord
        from app.models.novel import Novel, Chapter

        if not (await db.execute(select(Comment).limit(1))).scalars().first():
            now = int(time.time() * 1000)
            novels = (await db.execute(select(Novel).where(Novel.deleted == 0))).scalars().all()
            readers = (await db.execute(select(Reader).limit(2))).scalars().all()
            if novels and readers:
                reader_id = readers[0].id
                for n in novels[:3]:
                    db.add(Comment(novel_id=n.id, reader_id=reader_id, content="示例评论内容", rating=4, likes=random.randint(5, 50), status=1, created_at=now - random.randint(0, 86400000)))
                    db.add(Bookshelf(reader_id=reader_id, novel_id=n.id, added_at=now - random.randint(0, 86400000 * 7)))
                    first_chapter = (await db.execute(
                        select(Chapter).where(Chapter.novel_id == n.id).order_by(Chapter.index).limit(1)
                    )).scalars().first()
                    if first_chapter:
                        db.add(ReadingHistory(reader_id=reader_id, novel_id=n.id, chapter_id=first_chapter.id, chapter_index=1, percent=random.uniform(10, 100), read_at=now - random.randint(0, 86400000)))

        await db.commit()
        print("seed done")


async def seed_content(db) -> None:
    """首次运行才写入内容域示例数据。"""
    now = int(time.time() * 1000)
    authors: dict[str, Author] = {}
    for idx, (title, pen_name, cat, ctype, rate) in enumerate(NOVELS):
        author = Author(
            pen_name=pen_name,
            real_name=f"作者{idx + 1}",
            contract_type=ctype,
            contract_rate=rate / 100 if ctype != "buyout" else rate,
            status=1,
        )
        db.add(author)
        await db.flush()
        authors[pen_name] = author

        statuses = ["published", "published", "published", "pending", "draft"]
        flags_list = ["hot,editor-pick,free-limited", "hot", "editor-pick", "", ""]
        novel = Novel(
            title=title,
            author_id=author.id,
            author_name=pen_name,
            cover="",
            category=cat,
            intro=f"{title}：{pen_name} 作品，示例内容用于演示。",
            word_count=0,
            status=statuses[idx],
            flags=flags_list[idx],
            rating=4.5 + (idx % 5) * 0.1,
            rating_count=1000 + idx * 250,
            follow_count=5000 + idx * 1300,
            click_count=120000 + idx * 30000,
            price=10 if idx % 2 == 0 else 0,
            is_completed=1 if idx in (0, 1) else 0,
            tags_str=["热血,爽文,玄幻", "仙侠,修真,经典", "言情,甜宠,现代", "悬疑,推理,烧脑", "科幻,末世,未来"][idx],
            published_at=now - idx * 86400000,
            shelved_at=now - idx * 86400000,
        )
        db.add(novel)
        await db.flush()

        # 章节：每部 5 章
        chapter_count = 5
        chapter_word_total = 0
        for ci in range(chapter_count):
            words = 1800 + ci * 150
            chapter_word_total += words
            ch_status = "published" if statuses[idx] == "published" else statuses[idx]
            db.add(
                Chapter(
                    novel_id=novel.id,
                    index=ci + 1,
                    title=f"第{ci + 1}章 {title}开篇",
                    content="示例章节内容……" * 30,
                    content_text="示例章节内容……" * 30,
                    word_count=words,
                    pure_word_count=words - 120,
                    punctuation_word_count=words,
                    is_vip=1 if ci >= 2 else 0,
                    status=ch_status,
                    audit_level="first",
                    published_at=now - idx * 86400000 - ci * 3600000,
                )
            )
        novel.word_count = chapter_word_total
        await db.flush()

        # 稿费明细：最近 3 个月
        first_day = date.today().replace(day=1)
        for m in range(3):
            d = first_day
            for _ in range(m):
                d = (d - timedelta(days=1)).replace(day=1)
            month_str = f"{d.year}-{d.month:02d}"

            word_count = chapter_word_total
            subscription_revenue = random.randint(8000, 20000)
            if ctype == "buyout":
                amount = (word_count // 1000 + 1) * rate
            elif ctype == "share":
                amount = round(subscription_revenue * rate / 100)
            else:
                amount = max(5000, round(subscription_revenue * rate / 100))

            if m == 0:
                status = "pending"
                settled_at, withdrawn_at = 0, 0
            elif m == 1:
                status = "settled"
                settled_at, withdrawn_at = now - (idx + 1) * 86400000, 0
            else:
                status = "withdrawn"
                settled_at, withdrawn_at = now - (idx + 2) * 86400000, now - (idx + 1) * 86400000

            db.add(
                RoyaltyDetail(
                    month=month_str,
                    novel_id=novel.id,
                    author_id=author.id,
                    chapter_count=chapter_count,
                    word_count=word_count,
                    contract_type=ctype,
                    rate=rate / 100 if ctype != "buyout" else rate,
                    subscription_revenue=subscription_revenue,
                    amount=amount,
                    status=status,
                    settled_at=settled_at,
                    withdrawn_at=withdrawn_at,
                    created_at=now,
                )
            )


if __name__ == "__main__":
    asyncio.run(seed())
