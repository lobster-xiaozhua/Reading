"""C 端笔记服务（选词笔记 CRUD）。"""

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ParamError
from app.models.notes import ReaderNote
from app.models.novel import Chapter, Novel
from app.schemas.c_end import NoteCreateBody, NoteItem, NoteUpdateBody
from app.utils.time import now_ms as _now_ms

logger = structlog.get_logger(__name__)


class NotesService:
    """读者笔记服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_note(self, reader_id: int, body: NoteCreateBody) -> str:
        """创建选词笔记。"""
        text = (body.text or "").strip()
        if not text:
            raise ParamError("笔记内容不能为空")
        await self._validate_target(body)
        now = _now_ms()
        note = ReaderNote(
            reader_id=reader_id,
            novel_id=body.novel_id,
            chapter_id=body.chapter_id,
            text=text,
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

    async def _validate_target(self, body: NoteCreateBody) -> None:
        """校验笔记关联的作品与章节存在且已发布。"""
        novel = await self.session.get(Novel, body.novel_id)
        if not novel or novel.deleted or novel.status != "published":
            raise ParamError("作品不存在或已下架")
        if not body.chapter_id:
            return
        chapter = await self.session.get(Chapter, body.chapter_id)
        if (
            not chapter
            or chapter.novel_id != body.novel_id
            or chapter.deleted
            or chapter.status != "published"
        ):
            raise ParamError("章节不存在或不属于该作品")

    async def list_notes(
        self, reader_id: int, novel_id: int | None = None, limit: int = 50
    ) -> list[NoteItem]:
        """查询读者笔记列表（可按作品过滤）。"""
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
        """更新笔记内容（仅更新 annotation 字段）。"""
        note = await self.session.get(ReaderNote, note_id)
        if not note or note.reader_id != reader_id:
            raise NotFoundError("笔记不存在")
        if body.annotation is not None:
            note.annotation = body.annotation
        note.updated_at = _now_ms()
        await self.session.commit()
        return True

    async def delete_note(self, reader_id: int, note_id: int) -> bool:
        """删除笔记。"""
        note = await self.session.get(ReaderNote, note_id)
        if not note or note.reader_id != reader_id:
            raise NotFoundError("笔记不存在")
        await self.session.delete(note)
        await self.session.commit()
        return True
