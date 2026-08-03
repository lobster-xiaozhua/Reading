"""C 端笔记路由（选词笔记 CRUD）。"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_reader, ok
from app.core.database import get_db
from app.schemas.c_end import NoteCreateBody, NoteUpdateBody
from app.services.notes_service import NotesService

router = APIRouter(prefix="/me/notes")


@router.post("")
async def create_note(
    request: Request,
    body: NoteCreateBody,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = NotesService(db)
    note_id = await svc.create_note(reader_id, body)
    return ok(request, {"id": note_id})


@router.get("")
async def list_notes(
    request: Request,
    novel_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = NotesService(db)
    items = await svc.list_notes(reader_id, novel_id, limit)
    return ok(request, items)


@router.put("/{note_id}")
async def update_note(
    request: Request,
    note_id: int,
    body: NoteUpdateBody,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = NotesService(db)
    await svc.update_note(reader_id, note_id, body)
    return ok(request, True)


@router.delete("/{note_id}")
async def delete_note(
    request: Request,
    note_id: int,
    reader_id: int = Depends(get_current_reader),
    db: AsyncSession = Depends(get_db),
):
    svc = NotesService(db)
    await svc.delete_note(reader_id, note_id)
    return ok(request, True)