-- 小说站 PostgreSQL schema（生产级重构）
-- 执行：psql -U postgres -d novel_db -f schema.sql
-- 或由 db.init_schema() 自动执行

-- ============ 书籍元数据 ============
CREATE TABLE IF NOT EXISTS books (
    id              VARCHAR(191) PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    author          VARCHAR(128) NOT NULL DEFAULT '佚名',
    description     TEXT,
    cover           VARCHAR(255) DEFAULT NULL,
    tags_json       JSONB,
    word_count      INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_updated ON books (updated_at);
CREATE INDEX IF NOT EXISTS idx_books_words ON books (word_count);

-- ============ 章节分表（按 book_id 哈希到 16 张物理表） ============
-- 路由规则在 db.table_for(book_id) 中：chapters_{hash(book_id) % 16:02d}
-- 所有分表结构一致，此处以 chapters_00 为例，其余 15 张由 init_schema() 循环创建。
CREATE TABLE IF NOT EXISTS chapters_00 (
    id          BIGSERIAL PRIMARY KEY,
    book_id     VARCHAR(191) NOT NULL,
    idx         INTEGER NOT NULL,
    title       VARCHAR(255) NOT NULL,
    content     TEXT,
    word_count  INTEGER NOT NULL DEFAULT 0,
    UNIQUE (book_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_chapters_00_book ON chapters_00 (book_id);

-- 其余 15 张分表（chapters_01 ~ chapters_15）由 db.init_schema() 自动创建。

-- ============ 标签规范化 ============
CREATE TABLE IF NOT EXISTS tags (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(64) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS book_tags (
    book_id VARCHAR(191) NOT NULL,
    tag_id  INTEGER NOT NULL,
    PRIMARY KEY (book_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_book_tags_tag ON book_tags (tag_id);

-- ============ 用户（预留，暂不接登录） ============
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(64) NOT NULL UNIQUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============ 订单（预留，无 VIP/付费逻辑） ============
CREATE TABLE IF NOT EXISTS orders (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,
    book_id     VARCHAR(191),
    amount      NUMERIC(10,2) DEFAULT 0.00,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
