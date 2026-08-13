"""章节服务测试（字数统计 + 状态机 + CRUD）。"""

import pytest

from app.core.exceptions import BizError, NotFoundError
from app.models.novel import Chapter, Novel
from app.schemas.b_end import (
    ChapterReorderBody,
    ChapterSubmitBody,
    ChapterTransitionBody,
    ChapterUpdateBody,
)
from app.services.chapter_service import ChapterService, _count_words, _split_chapters


@pytest.fixture
def svc(db_session):
    return ChapterService(db_session)

async def _create_novel_and_chapters(session, count=3):
    """创建测试作品与章节。"""
    novel = Novel(title="测试", status="published", word_count=100)
    session.add(novel)
    await session.flush()
    chapters = []
    for i in range(count):
        ch = Chapter(
            novel_id=novel.id,
            index=i,
            title=f"第{i + 1}章",
            content=f"内容{i}",
            word_count=100,
            status="draft",
        )
        session.add(ch)
        chapters.append(ch)
    await session.flush()
    return novel, chapters


class TestWordCount:
    def test_empty_content(self):
        assert _count_words("") == (0, 0, 0)

    def test_plain_text(self):
        total, pure, _punct = _count_words("你好世界hello")
        # 你好世界=4 中文，hello=5 英文，共 9 纯文字
        assert pure == 9
        # 含标点字数 = 总字数（非空白字符）
        assert total == 9

    def test_html_stripped(self):
        _total, pure, _punct = _count_words("<p>测试文本</p>")
        assert pure == 4

    def test_with_punctuation(self):
        """含标点符号的文本：纯文字 < 含标点字数。"""
        total, pure, punct = _count_words("你好，世界！Hello, World!")
        # 纯文字：你好世界HelloWorld = 4 + 10 = 14
        assert pure == 14
        # 含标点：所有非空白字符
        assert punct > pure
        # 总字数与含标点字数一致（当前实现）
        assert total == punct

    def test_with_whitespace(self):
        """含空白字符的文本：空白不计入字数。"""
        total, pure, punct = _count_words("  你好 世界  hello  world  ")
        # 纯文字：你好世界helloworld = 4 + 10 = 14
        assert pure == 14
        # 含标点（非空白字符）：14
        assert punct == 14
        # 总字数与含标点字数一致
        assert total == punct

    def test_mixed_html_and_punctuation(self):
        """混合 HTML 标签与标点的文本。"""
        total, pure, punct = _count_words(
            '<p class="intro">这是<strong>第一段</strong>，包含标点符号！</p>'
        )
        # 纯文字：这是第一段包含标点符号 = 11
        assert pure == 11
        # 含标点：去除 HTML 和空白后的字符数 > 纯文字
        assert punct > pure
        assert total == punct

    def test_only_punctuation(self):
        """只有标点符号的文本：纯文字为 0。"""
        total, pure, punct = _count_words("，。！？；：")
        assert pure == 0
        assert punct == 6
        assert total == punct

    def test_numbers_counted_as_pure(self):
        """数字计入纯文字字数。"""
        _total, pure, _punct = _count_words("第123章")
        # 第 + 123 + 章 = 1 + 3 + 1 = 5
        assert pure == 5


class TestChapterServiceList:
    async def test_list_chapters(self, svc, db_session):
        novel, _chapters = await _create_novel_and_chapters(db_session, 3)
        resp = await svc.list_chapters(novel.id)
        assert resp.total == 3
        assert resp.items[0].index == 0
        assert resp.items[2].index == 2

    async def test_list_empty(self, svc, db_session):
        novel = Novel(title="空作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        resp = await svc.list_chapters(novel.id)
        assert resp.items == []


class TestChapterServiceCreate:
    async def test_create_chapter(self, svc, db_session):
        novel = Novel(title="测试", status="draft")
        db_session.add(novel)
        await db_session.flush()
        body = ChapterSubmitBody(
            novel_id=str(novel.id),
            title="第一章",
            content="这是正文内容",
            is_vip=False,
        )
        detail = await svc.create_chapter(body)
        assert detail.title == "第一章"
        assert detail.index == 0
        assert detail.status == "draft"


class TestChapterServiceUpdate:
    async def test_update_title(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterUpdateBody(title="新标题")
        detail = await svc.update_chapter(chapters[0].id, body)
        assert detail.title == "新标题"

    async def test_update_content_recalculates_words(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterUpdateBody(content="全新的内容文字")
        detail = await svc.update_chapter(chapters[0].id, body)
        assert detail.word_count > 0

    async def test_update_is_vip_flag(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        detail = await svc.update_chapter(chapters[0].id, ChapterUpdateBody(is_vip=True))
        assert detail.is_vip is True
        detail2 = await svc.update_chapter(chapters[0].id, ChapterUpdateBody(is_vip=False))
        assert detail2.is_vip is False


class TestChapterServiceReorder:
    async def test_reorder(self, svc, db_session):
        novel, chapters = await _create_novel_and_chapters(db_session, 3)
        # 反转顺序
        ordered = [str(c.id) for c in reversed(chapters)]
        body = ChapterReorderBody(ordered_ids=ordered)
        result = await svc.reorder_chapters(novel.id, body)
        assert result is True
        resp = await svc.list_chapters(novel.id)
        assert resp.items[0].id == ordered[0]


class TestChapterServiceTransition:
    async def test_transition_to_pending(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterTransitionBody(target="pending")
        detail = await svc.transition(chapters[0].id, body)
        assert detail.status == "pending"

    async def test_invalid_transition_raises(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterTransitionBody(target="published")
        with pytest.raises(BizError):
            await svc.transition(chapters[0].id, body)

    async def test_transition_to_published_sets_published_at(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        await svc.transition(chapters[0].id, ChapterTransitionBody(target="pending"))
        detail = await svc.transition(chapters[0].id, ChapterTransitionBody(target="published"))
        assert detail.status == "published"
        assert detail.published_at > 0


class TestChapterServiceBatch:
    async def test_batch_submit(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 3)
        from app.schemas.b_end import ChapterBatchOperateBody

        result = await svc.batch_operate(
            ChapterBatchOperateBody(ids=[c.id for c in chapters], action="submit")
        )
        assert result.success is True
        assert result.affected == 3
        resp = await svc.list_chapters(_novel.id)
        assert all(i.status == "pending" for i in resp.items)

    async def test_batch_publish(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 2)
        from app.schemas.b_end import ChapterBatchOperateBody

        await svc.batch_operate(ChapterBatchOperateBody(ids=[c.id for c in chapters], action="submit"))
        result = await svc.batch_operate(
            ChapterBatchOperateBody(ids=[c.id for c in chapters], action="publish")
        )
        assert result.success is True
        assert result.affected == 2

    async def test_batch_invalid_action_collects_failures(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        from app.schemas.b_end import ChapterBatchOperateBody

        result = await svc.batch_operate(
            ChapterBatchOperateBody(ids=[chapters[0].id], action="explode")
        )
        assert result.success is False
        assert result.affected == 0
        assert result.failed and result.failed[0]["reason"].startswith("不支持的操作")

    async def test_batch_mixed_missing_id(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 2)
        from app.schemas.b_end import ChapterBatchOperateBody

        result = await svc.batch_operate(
            ChapterBatchOperateBody(ids=[chapters[0].id, 99999], action="submit")
        )
        assert result.success is False
        assert result.affected == 1
        assert len(result.failed or []) == 1


class TestChapterServiceDelete:
    async def test_delete_draft_chapter(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        result = await svc.delete_chapter(chapters[0].id)
        assert result is True

    async def test_delete_published_requires_title_match(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        chapters[0].status = "published"
        await db_session.flush()
        # 不匹配标题应抛异常
        with pytest.raises(BizError):
            await svc.delete_chapter(chapters[0].id, title_match="错误标题")
        # 匹配后可删除
        result = await svc.delete_chapter(chapters[0].id, title_match="第1章")
        assert result is True

    async def test_delete_not_found(self, svc):
        with pytest.raises(NotFoundError):
            await svc.delete_chapter(99999)


class TestChapterCacheEviction:
    async def test_delete_published_chapter_evicts_caches(self, db_session, redis_client):
        """删除已发布章节后必须失效目录与正文缓存（否则读者 TTL 内读到旧内容）。"""
        from app.core.redis import CacheKeys
        from app.services.chapter_service import ChapterService

        novel, chapters = await _create_novel_and_chapters(db_session, 1)
        chapters[0].status = "published"
        await db_session.commit()
        svc = ChapterService(db_session, redis_client)
        await redis_client.set(CacheKeys.chapters(novel.id), "[]")
        await redis_client.set(CacheKeys.chapter(novel.id, chapters[0].id), "{}")
        await svc.delete_chapter(chapters[0].id, title_match=chapters[0].title)
        assert await redis_client.get(CacheKeys.chapters(novel.id)) is None
        assert await redis_client.get(CacheKeys.chapter(novel.id, chapters[0].id)) is None


class _FakeUpload:
    """最小 UploadFile 替身（仅用于 service 层测试）。"""

    def __init__(self, filename: str, data: bytes):
        self.filename = filename
        self._data = data

    async def read(self) -> bytes:
        return self._data


class TestChapterServiceImport:
    async def test_import_multiple_files(self, svc, db_session):
        novel = Novel(title="测试导入", status="draft")
        db_session.add(novel)
        await db_session.flush()
        files = [
            _FakeUpload("第一章.txt", "这是第一章正文内容".encode()),
            _FakeUpload("第二章.txt", "这是第二章正文内容，稍长一些。".encode()),
        ]
        result = await svc.import_chapters(novel.id, files)
        assert len(result["list"]) == 2
        assert len(result["errors"]) == 0
        first, second = result["list"]
        assert first["title"] == "第一章"
        assert first["sourceFile"] == "第一章.txt"
        assert first["index"] == 0
        assert first["wordCount"] > 0
        assert second["index"] == 1
        assert second["novelId"] == str(novel.id)

    async def test_import_gbk_encoding(self, svc, db_session):
        """GBK 编码的中文 txt 应正常解码。"""
        novel = Novel(title="GBK作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        content = "这是GBK编码的中文正文内容".encode("gbk")
        result = await svc.import_chapters(novel.id, [_FakeUpload("gbk章.txt", content)])
        assert len(result["list"]) == 1
        assert result["errors"] == []
        assert result["list"][0]["title"] == "gbk章"

    async def test_import_utf8_bom(self, svc, db_session):
        """带 UTF-8 BOM 的文件应剥离 BOM 后正常导入。"""
        novel = Novel(title="BOM作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        content = b"\xef\xbb\xbf" + "带BOM的正文".encode()
        result = await svc.import_chapters(novel.id, [_FakeUpload("bom章.txt", content)])
        assert len(result["list"]) == 1
        assert result["errors"] == []

    async def test_import_duplicate_titles(self, svc, db_session):
        novel = Novel(title="重名作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        result = await svc.import_chapters(
            novel.id,
            [_FakeUpload("同名.txt", b"1"), _FakeUpload("同名.txt", b"2")],
        )
        titles = [item["title"] for item in result["list"]]
        assert titles == ["同名", "同名_1"]

    async def test_import_collects_per_file_errors(self, svc, db_session):
        novel = Novel(title="混合作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        files = [
            _FakeUpload("正常.txt", "正常正文".encode()),
            _FakeUpload("图片.png", b"not a txt"),
            _FakeUpload("空的.txt", b""),
            _FakeUpload("坏编码.txt", b"\xff\xfe\x00\x80"),
        ]
        result = await svc.import_chapters(novel.id, files)
        assert len(result["list"]) == 1
        reasons = {e["filename"]: e["reason"] for e in result["errors"]}
        assert "图片.png" in reasons
        assert "空的.txt" in reasons
        assert "坏编码.txt" in reasons
        assert "仅支持 .txt" in reasons["图片.png"]
        assert "内容为空" in reasons["空的.txt"]
        assert "编码" in reasons["坏编码.txt"]

    async def test_import_oversize_file_rejected(self, svc, db_session):
        novel = Novel(title="超大作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        big = _FakeUpload("超大.txt", b"a" * (5 * 1024 * 1024 + 1))
        result = await svc.import_chapters(novel.id, [big])
        assert result["list"] == []
        assert "5MB" in result["errors"][0]["reason"]

    async def test_import_too_many_files_rejected(self, svc, db_session):
        novel = Novel(title="超量作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        files = [_FakeUpload(f"第{i}.txt", b"x") for i in range(201)]
        result = await svc.import_chapters(novel.id, files)
        assert result["list"] == []
        assert "200" in result["errors"][0]["reason"]

    async def test_import_evicts_chapters_cache(self, db_session, redis_client):
        """批量导入后必须失效 C 端目录缓存。"""
        from app.core.redis import CacheKeys
        from app.services.chapter_service import ChapterService

        novel = Novel(title="缓存作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        svc = ChapterService(db_session, redis_client)
        await redis_client.set(CacheKeys.chapters(novel.id), "[]")
        await svc.import_chapters(novel.id, [_FakeUpload("缓存章.txt", "正文内容".encode())])
        assert await redis_client.get(CacheKeys.chapters(novel.id)) is None


class TestSplitChapters:
    def test_split_detects_chapter_patterns(self):
        content = (
            "这是一些卷首语。\n\n"
            "第一章 山巅之上\n"
            "第一段正文内容。\n\n"
            "第2章 风云再起\n"
            "第二段正文内容。\n"
        )
        parts = _split_chapters(content, "卷.txt")
        assert len(parts) == 2
        assert parts[0]["title"] == "第一章 山巅之上"
        assert parts[0]["content"] == "第一段正文内容。"
        assert parts[1]["title"] == "第2章 风云再起"
        assert parts[1]["content"] == "第二段正文内容。"

    def test_split_no_match_uses_filename(self):
        content = "没有章节标题的普通正文内容。"
        parts = _split_chapters(content, "README.txt")
        assert len(parts) == 1
        assert parts[0]["title"] == "README"
        assert parts[0]["content"] == content

    def test_split_with_chinese_numerals(self):
        content = "第1章 开篇\n正文一\n\n第二回 发展\n正文二\n\n第三节 高潮\n正文三\n"
        parts = _split_chapters(content, "卷.txt")
        assert len(parts) == 3
        assert parts[0]["title"] == "第1章 开篇"
        assert parts[1]["title"] == "第二回 发展"
        assert parts[2]["title"] == "第三节 高潮"

    def test_split_with_prologue(self):
        content = "楔子\n古老的传说开始流传。\n\n第一章 开始\n正文内容。\n"
        parts = _split_chapters(content, "卷.txt")
        assert len(parts) == 2
        assert parts[0]["title"] == "楔子"
        assert parts[1]["title"] == "第一章 开始"

    def test_split_removes_whitespace_in_body(self):
        content = "序章  \n开篇正文。\n\n"
        parts = _split_chapters(content, "卷.txt")
        assert parts[0]["title"] == "序章"
        assert parts[0]["content"] == "开篇正文。"


class TestChapterServiceImportWithSplit:
    async def test_import_with_split(self, svc, db_session):
        novel = Novel(title="切分作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        content = "第一章 开篇\n这是第一章正文。\n\n第2章 发展中\n第二章正文内容。\n".encode()
        result = await svc.import_chapters(
            novel.id, [_FakeUpload("整卷.txt", content)], split=True,
        )
        assert len(result["list"]) == 2
        assert result["errors"] == []
        assert result["list"][0]["title"] == "第一章 开篇"
        assert result["list"][1]["title"] == "第2章 发展中"
        assert result["list"][0]["sourceFile"] == "整卷.txt"

    async def test_import_with_split_duplicate_titles(self, svc, db_session):
        """跨文件切分后标题重复自动加 _1 后缀。"""
        novel = Novel(title="重名切分", status="draft")
        db_session.add(novel)
        await db_session.flush()
        f1 = _FakeUpload("卷一.txt", "第一章 开篇\n正文一。\n".encode())
        f2 = _FakeUpload("卷二.txt", "第一章 开篇\n正文二。\n".encode())
        result = await svc.import_chapters(novel.id, [f1, f2], split=True)
        titles = [item["title"] for item in result["list"]]
        assert titles == ["第一章 开篇", "第一章 开篇_1"]
