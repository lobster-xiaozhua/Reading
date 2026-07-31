from pydantic import BaseModel, Field
from typing import List, Optional

from config import MAX_IMPORT_MB


class ChapterMeta(BaseModel):
    id: str
    title: str


class BookSummary(BaseModel):
    id: str
    title: str
    author: str
    description: str
    cover: Optional[str] = None
    chapter_count: int
    tags: List[str] = []
    word_count: int = 0
    updated_at: Optional[str] = None


class BookDetail(BaseModel):
    id: str
    title: str
    author: str
    description: str
    cover: Optional[str] = None
    chapters: List[ChapterMeta]
    tags: List[str] = []
    word_count: int = 0
    updated_at: Optional[str] = None


class ChapterContent(BaseModel):
    id: str
    title: str
    book_id: str
    book_title: str
    prev: Optional[str] = None
    next: Optional[str] = None
    paragraphs: List[str]


class BookIn(BaseModel):
    id: str
    title: str = ""
    author: str = ""
    description: str = ""
    tags: list[str] = []


class BookInfoIn(BaseModel):
    title: str = ""
    author: str = ""
    description: str = ""
    tags: list[str] = None


class RenameIn(BaseModel):
    new_id: str


class ChapterIn(BaseModel):
    title: str = ""
    content: str = ""


class ImportIn(BaseModel):
    text: str = Field(max_length=MAX_IMPORT_MB * 1024 * 1024)


class TagsIn(BaseModel):
    tags: list[str] = []


class ChapterOrderIn(BaseModel):
    order: list[int]


class UserRegister(BaseModel):
    username: str = Field(min_length=2, max_length=64, pattern=r"^[a-zA-Z0-9_\u4e00-\u9fa5]+$")
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool = False
    created_at: str


class TokenOut(BaseModel):
    token: str
    user: UserOut


class ProgressIn(BaseModel):
    book_id: str
    chapter_id: str = ""
    scroll_top: int = 0
    progress: float = 0
