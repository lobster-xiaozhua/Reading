"""CLI：从 PostgreSQL 全量重建 Meilisearch（与 POST /api/admin/reindex 同源）。"""
import logging
import sys

logging.basicConfig(level=logging.INFO)

import db
import search


def main():
    try:
        db.init_schema()
    except Exception as e:
        print("PostgreSQL 不可用:", e, file=sys.stderr)
        sys.exit(1)
    if not search.init_meili():
        print("Meilisearch 不可用", file=sys.stderr)
        sys.exit(1)
    result = search.reindex_all()
    print(result)
    sys.exit(0 if result.get("ok") else 1)


if __name__ == "__main__":
    main()
