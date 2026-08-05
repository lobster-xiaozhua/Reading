"""笔记服务测试：CRUD。"""

import pytest

from app.core.exceptions import NotFoundError, ParamError
from app.models.notes import ReaderNote
from app.schemas.c_end import NoteCreateBody, NoteUpdateBody
from app.services.notes_service import NotesService


@pytest.fixture
def svc(db_session):
    return NotesService(db_session)


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
    async def test_create_success(self, svc):
        body = NoteCreateBody(
            novel_id=1,
            chapter_id=1,
            text="精彩段落",
            paragraph_index=0,
            offset_start=0,
            offset_end=10,
        )
        note_id = await svc.create_note(1001, body)
        assert note_id is not None
        assert len(note_id) > 0

    async def test_create_empty_text_raises(self, svc):
        body = NoteCreateBody(novel_id=1, chapter_id=1, text="")
        with pytest.raises(ParamError):
            await svc.create_note(1001, body)

    async def test_create_whitespace_only_raises(self, svc):
        body = NoteCreateBody(novel_id=1, chapter_id=1, text="   ")
        with pytest.raises(ParamError):
            await svc.create_note(1001, body)

    async def test_create_with_annotation(self, svc):
        body = NoteCreateBody(
            novel_id=1,
            chapter_id=1,
            text="好句",
            annotation="这是重点",
        )
        note_id = await svc.create_note(1001, body)
        note = await svc.session.get(ReaderNote, int(note_id))
        assert note is not None
        assert note.annotation == "这是重点"


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
