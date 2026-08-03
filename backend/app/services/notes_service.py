"""C 端笔记服务（选词笔记 CRUD）。"""

import time
import logging

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ParamError
from app.models.notes import ReaderNote
from app.schemas.c_end import NoteItem, NoteCreateBody, NoteUpdateBody

logger = logging.getLogger(__name__)


class NotesService:
    """读者笔记服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_note(self, reader_id: int, body: NoteCreateBody) -> str:
        if not body.text or not body.text.strip():
            raise ParamError("笔记内容不能为空")
        now = int(time.time() * 1000)
        note = ReaderNote(
            reader_id=reader_id,
            novel_id=body.novel_id,
            chapter_id=body.chapter_id,
            text=body.text.strip(),
            paragraph_index=body.paragraph_index or 0,
            offset_start=body.offset_start or 0,
            offset_end=body.offset_end or 0,
            annotation=body.annotation or "",
            created_at=now,
            updated_at=now,
        )
        self.session.add(note)
        await self.session.flush()
        await self.session.commit()
        return str(note.id)

    async def list_notes(
        self, reader_id: int, novel_id: int | None = None, limit: int = 50
    ) -> list[NoteItem]:
        stmt = (
            select(ReaderNote)
            .where(ReaderNote.reader_id == reader_id)
            .order_by(ReaderNote.created_at.desc())
            .limit(limit)
        )
        if novel_id:
            stmt = stmt.where(ReaderNote.novel_id == novel_id)
        rows = (await self.session.execute(stmt)).scalars().all()
        return [
            NoteItem(
                id=str(n.id),
                novel_id=n.novel_id,
                chapter_id=n.chapter_id,
                text=n.text,
                paragraph_index=n.paragraph_index,
                offset_start=n.offset_start,
                offset_end=n.offset_end,
                annotation=n.annotation,
                created_at=n.created_at,
                updated_at=n.updated_at,
            )
            for n in rows
        ]

    async def update_note(self, reader_id: int, note_id: int, body: NoteUpdateBody) -> bool:
        note = await self.session.get(ReaderNote, note_id)
        if not note or note.reader_id != reader_id:
            raise NotFoundError("笔记不存在")
        if body.annotation is not None:
            note.annotation = body.annotation
        note.updated_at = int(time.time() * 1000)
        await self.session.commit()
        return True

    async def delete_note(self, reader_id: int, note_id: int) -> bool:
        note = await self.session.get(ReaderNote, note_id)
        if not note or note.reader_id != reader_id:
            raise NotFoundError("笔记不存在")
        await self.session.delete(note)
        await self.session.commit()
        return True