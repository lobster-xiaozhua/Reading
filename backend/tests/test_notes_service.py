"""笔记服务测试：CRUD。"""

import pytest

from app.core.exceptions import NotFoundError, ParamError
from app.models.notes import ReaderNote
from app.models.novel import Chapter, Novel
from app.schemas.c_end import NoteCreateBody, NoteUpdateBody
from app.services.notes_service import NotesService


@pytest.fixture
def svc(db_session):
    return NotesService(db_session)


async def _create_published_novel(session, **kwargs):
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "published",
        "word_count": 50000,
        "rating": 4.5,
        "is_completed": 0,
        "flags": "",
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


async def _create_published_chapter(session, novel_id, **kwargs):
    defaults = {
        "novel_id": novel_id,
        "index": 1,
        "title": "第一章",
        "content": "正文内容",
        "status": "published",
        "word_count": 500,
        "is_vip": 0,
    }
    defaults.update(kwargs)
    chapter = Chapter(**defaults)
    session.add(chapter)
    await session.flush()
    return chapter


async def _create_note(session, **kwargs):
    defaults = {
        "reader_id": 1001,
        "novel_id": 1,
        "chapter_id": 1,
        "text": "测试笔记内容",
        "paragraph_index": 0,
        "offset_start": 0,
        "offset_end": 10,
        "annotation": "",
        "created_at": 1000000,
        "updated_at": 1000000,
    }
    defaults.update(kwargs)
    note = ReaderNote(**defaults)
    session.add(note)
    await session.flush()
    return note


class TestCreateNote:
    async def test_create_success(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, novel.id)
        body = NoteCreateBody(
            novel_id=novel.id,
            chapter_id=chapter.id,
            text="精彩段落",
            paragraph_index=0,
            offset_start=0,
            offset_end=10,
        )
        note_id = await svc.create_note(1001, body)
        assert note_id is not None
        assert len(note_id) > 0

    async def test_create_empty_text_raises(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        body = NoteCreateBody(novel_id=novel.id, chapter_id=1, text="")
        with pytest.raises(ParamError):
            await svc.create_note(1001, body)

    async def test_create_whitespace_only_raises(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        body = NoteCreateBody(novel_id=novel.id, chapter_id=1, text="   ")
        with pytest.raises(ParamError):
            await svc.create_note(1001, body)

    async def test_create_with_annotation(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, novel.id)
        body = NoteCreateBody(
            novel_id=novel.id,
            chapter_id=chapter.id,
            text="好句",
            annotation="这是重点",
        )
        note_id = await svc.create_note(1001, body)
        note = await svc.session.get(ReaderNote, int(note_id))
        assert note is not None
        assert note.annotation == "这是重点"

    async def test_create_wrong_chapter_raises(self, svc, db_session):
        """章节不属于该作品时拒绝创建。"""
        novel = await _create_published_novel(db_session)
        other = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, other.id)
        body = NoteCreateBody(
            novel_id=novel.id,
            chapter_id=chapter.id,
            text="越权笔记",
        )
        with pytest.raises(ParamError):
            await svc.create_note(1001, body)

    async def test_create_unpublished_novel_raises(self, svc, db_session):
        novel = await _create_published_novel(db_session, status="draft")
        body = NoteCreateBody(novel_id=novel.id, chapter_id=1, text="内容")
        with pytest.raises(ParamError):
            await svc.create_note(1001, body)


class TestListNotes:
    async def test_list_empty(self, svc):
        notes = await svc.list_notes(99999)
        assert len(notes) == 0

    async def test_list_with_data(self, svc, db_session):
        await _create_note(db_session)
        notes = await svc.list_notes(1001)
        assert len(notes) == 1
        assert notes[0].text == "测试笔记内容"

    async def test_list_filter_by_novel(self, svc, db_session):
        await _create_note(db_session, novel_id=1)
        await _create_note(db_session, novel_id=2, text="另一本书")
        notes = await svc.list_notes(1001, novel_id=1)
        assert len(notes) == 1
        assert notes[0].novel_id == 1

    async def test_list_multiple_notes(self, svc, db_session):
        await _create_note(db_session, text="笔记1")
        await _create_note(db_session, text="笔记2")
        notes = await svc.list_notes(1001)
        assert len(notes) == 2

    async def test_list_limits_results(self, svc, db_session):
        for i in range(5):
            await _create_note(db_session, text=f"笔记{i}")
        notes = await svc.list_notes(1001, limit=3)
        assert len(notes) == 3


class TestUpdateNote:
    async def test_update_annotation(self, svc, db_session):
        note = await _create_note(db_session)
        body = NoteUpdateBody(annotation="更新后的注释")
        result = await svc.update_note(1001, note.id, body)
        assert result is True
        await db_session.refresh(note)
        assert note.annotation == "更新后的注释"

    async def test_update_nonexistent_raises(self, svc):
        body = NoteUpdateBody(annotation="注释")
        with pytest.raises(NotFoundError):
            await svc.update_note(1001, 99999, body)

    async def test_update_wrong_owner_raises(self, svc, db_session):
        note = await _create_note(db_session, reader_id=1001)
        body = NoteUpdateBody(annotation="注释")
        with pytest.raises(NotFoundError):
            await svc.update_note(2002, note.id, body)


class TestDeleteNote:
    async def test_delete_success(self, svc, db_session):
        note = await _create_note(db_session)
        result = await svc.delete_note(1001, note.id)
        assert result is True
        deleted = await db_session.get(ReaderNote, note.id)
        assert deleted is None

    async def test_delete_nonexistent_raises(self, svc):
        with pytest.raises(NotFoundError):
            await svc.delete_note(1001, 99999)

    async def test_delete_wrong_owner_raises(self, svc, db_session):
        note = await _create_note(db_session, reader_id=1001)
        with pytest.raises(NotFoundError):
            await svc.delete_note(2002, note.id)
