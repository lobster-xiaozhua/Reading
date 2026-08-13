"""B 端敏感词管理服务（§8.7）。

提供敏感词库查询、增删、扫描。
词库版本号自增，扫描走 DFA Trie 树。
"""

from datetime import date

import redis.asyncio as redis
import structlog
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BizError, ErrorCode
from app.models.audit import SensitiveWord
from app.repositories.audit_repo import SensitiveWordRepository
from app.schemas.b_end import (
    AddSensitiveWordBody,
    SensitiveHit,
    SensitiveWordItem,
    SensitiveWordLib,
    SensitiveWordLibMeta,
)
from app.utils.sensitive_trie import SensitiveTrie
from app.utils.time import now_ms

logger = structlog.get_logger(__name__)

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
        """获取敏感词库（含按级别统计和版本元信息）。"""
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
            updated_at=now_ms(),
            total_count=len(words),
            by_level=by_level,
        )
        return SensitiveWordLib(words=items, meta=meta)

    # ── 新增敏感词 ─────────────────────────────────────────
    async def add_word(self, body: AddSensitiveWordBody) -> SensitiveWordItem:
        """新增敏感词，版本号自增并刷新 Trie 树。"""
        version = date.today().isoformat()
        try:
            word = await self.repo.add(body.text, body.level, body.suggestion, version)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise BizError(ErrorCode.PARAM_INVALID, "敏感词已存在") from None
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
        """删除敏感词，刷新 Trie 树。"""
        removed = await self.repo.remove(text, level)
        if removed:
            await self.session.commit()
            await self._refresh_trie()
        return removed

    # ── 批量导入 ─────────────────────────────────────────
    async def import_words(
        self, text: str, level: int = 3, suggestion: str = "",
    ) -> dict:
        """按行批量导入敏感词。

        每行一个词，自动去重（跳过头尾空白、空行、超过 64 字符的词，
        以及已存在的 text+level 组合）。返回新增/跳过数量。
        """
        version = date.today().isoformat()
        parsed: list[str] = []
        seen: set[str] = set()
        for raw_line in text.splitlines():
            word = raw_line.strip()
            if not word or word in seen:
                continue
            if len(word) > 64:
                continue
            seen.add(word)
            parsed.append(word)

        if not parsed:
            raise BizError(ErrorCode.PARAM_INVALID, "未解析到有效敏感词")

        existing = await self.repo.find_existing(parsed)
        new_words = [w for w in parsed if (w, level) not in existing]
        if not new_words:
            return {"added": 0, "skipped": len(parsed), "errors": []}

        await self.repo.add_all(
            [
                SensitiveWord(
                    text=w,
                    level=level,
                    suggestion=(suggestion or "")[:255],
                    lib_version=version,
                )
                for w in new_words
            ]
        )
        await self.session.commit()
        await self._refresh_trie()
        return {"added": len(new_words), "skipped": len(parsed) - len(new_words)}

    # ── 扫描文本 ─────────────────────────────────────────
    async def scan(self, text: str) -> list[SensitiveHit]:
        """扫描文本，返回敏感词命中列表。"""
        trie = await self._get_trie()
        hits = trie.scan(text)
        return [SensitiveHit(text=h.word, level=h.level, suggestion=h.suggestion) for h in hits]

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
