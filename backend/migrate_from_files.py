"""从旧版本地文件目录迁移到 PostgreSQL + Meilisearch。

用法：
  python migrate_from_files.py            # 迁移全部
  python migrate_from_files.py --book 星海拾遗   # 仅迁移一本

依赖：先在本机起好 PostgreSQL 与 Meilisearch，并在环境变量/默认值中配置连接。
"""
import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
import db
import search
from config import BOOKS_DIR


def _chapter_files(book_dir):
    d = book_dir / "chapters"
    if not d.exists():
        return []
    return sorted([p for p in d.iterdir() if p.is_file() and p.suffix.lower() == ".txt"], key=lambda p: p.name)


def _chapter_title(p):
    stem = p.stem
    return stem.split("_", 1)[1] if "_" in stem else stem


def migrate_one(book_id):
    book_dir = BOOKS_DIR / book_id
    if not book_dir.exists():
        print(f"  跳过（目录不存在）: {book_id}")
        return
    info = {}
    info_path = book_dir / "info.json"
    if info_path.exists():
        info = json.loads(info_path.read_text(encoding="utf-8"))
    title = info.get("title", book_id)
    author = info.get("author", "佚名")
    description = info.get("description", "")
    tags = info.get("tags", [])

    # 建书
    db.create_book(book_id, title, author, description, tags=tags)
    print(f"  书籍已建: {title} (tags={tags})")

    # 导入章节（整本拼接后走分章逻辑，保证与线上一致）
    files = _chapter_files(book_dir)
    full = []
    for f in files:
        full.append(f"第{_chapter_title(f)}")
        full.append(f.read_text(encoding="utf-8"))
    text = "\n\n".join(full)
    detail = db.import_full_text(book_id, text)
    print(f"  章节数: {len(detail.chapters)}")

    # 同步 Meili
    s = db.get_book_summary(book_id)
    search.index_book(s.dict())
    for ch in detail.chapters:
        c = db.get_chapter(book_id, ch.id)
        search.index_chapter(book_id, int(ch.id.split("_")[0]), ch.title, "\n".join(c.paragraphs), title)
    print(f"  已同步 Meilisearch")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", help="仅迁移指定 book_id")
    args = ap.parse_args()

    print("初始化 PostgreSQL schema ...")
    db.init_schema()
    print("初始化 Meilisearch ...")
    search.init_meili()

    if args.book:
        print(f"迁移单本: {args.book}")
        migrate_one(args.book)
        return

    if not BOOKS_DIR.exists():
        print("未找到本地 books 目录，无需迁移。")
        return
    for p in sorted(BOOKS_DIR.iterdir()):
        if p.is_dir():
            print(f"迁移: {p.name}")
            migrate_one(p.name)
    print("迁移完成。")


if __name__ == "__main__":
    main()
