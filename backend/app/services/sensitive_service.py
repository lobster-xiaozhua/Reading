"""B 端敏感词管理服务（§8.7）。

提供敏感词库查询、增删、扫描。
词库版本号自增，扫描走 DFA Trie 树。
"""

import logging
import time
from datetime import date

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.audit_repo import SensitiveWordRepository
from app.schemas.b_end import (
    AddSensitiveWordBody,
    SensitiveHit,
    SensitiveWordItem,
    SensitiveWordLib,
    SensitiveWordLibMeta,
)
from app.utils.sensitive_trie import SensitiveTrie

logger = logging.getLogger(__name__)

# 进程级 Trie 单例（随词库版本刷新）
_trie: SensitiveTrie | None = None
_trie_version: str = ""


class SensitiveService:
    """B 端敏感词管理服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client
        self.repo = SensitiveWordRepository(session)

    # ── 查询词库 ─────────────────────────────────────────
    async def get_lib(self) -> SensitiveWordLib:
        words = await self.repo.list_all()
        items = [
            SensitiveWordItem(
                id=str(w.id),
                text=w.text,
                level=w.level,
                suggestion=w.suggestion,
                lib_version=w.lib_version,
            )
            for w in words
        ]
        by_level: dict[str, int] = {}
        for w in words:
            by_level[str(w.level)] = by_level.get(str(w.level), 0) + 1
        version = await self.repo.current_version() or date.today().isoformat()
        meta = SensitiveWordLibMeta(
            version=version,
            updated_at=int(time.time() * 1000),
            total_count=len(words),
            by_level=by_level,
        )
        return SensitiveWordLib(words=items, meta=meta)

    # ── 新增敏感词 ─────────────────────────────────────────
    async def add_word(self, body: AddSensitiveWordBody) -> SensitiveWordItem:
        version = date.today().isoformat()
        word = await self.repo.add(body.text, body.level, body.suggestion, version)
        await self.session.commit()
        # 版本号自增并刷新 Trie
        await self._refresh_trie()
        return SensitiveWordItem(
            id=str(word.id),
            text=word.text,
            level=word.level,
            suggestion=word.suggestion,
            lib_version=word.lib_version,
        )

    # ── 删除敏感词 ─────────────────────────────────────────
    async def remove_word(self, text: str, level: int | None = None) -> bool:
        removed = await self.repo.remove(text, level)
        if removed:
            await self.session.commit()
            await self._refresh_trie()
        return removed

    # ── 扫描文本 ─────────────────────────────────────────
    async def scan(self, text: str) -> list[SensitiveHit]:
        """扫描文本返回敏感词命中列表。"""
        trie = await self._get_trie()
        hits = trie.scan(text)
        return [
            SensitiveHit(word=h.word, level=h.level, suggestion=h.suggestion)
            for h in hits
        ]

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_trie(self) -> SensitiveTrie:
        global _trie, _trie_version
        version = await self.repo.current_version() or ""
        if _trie is None or _trie_version != version:
            await self._refresh_trie()
        assert _trie is not None
        return _trie

    async def _refresh_trie(self) -> None:
        global _trie, _trie_version
        words = await self.repo.list_all()
        trie = SensitiveTrie()
        trie.load_with_meta([(w.text, w.level, w.suggestion) for w in words])
        _trie = trie
        _trie_version = await self.repo.current_version() or ""
        logger.info("敏感词 Trie 已刷新 version=%s size=%d", _trie_version, trie.size)
