"""敏感词服务测试：词库查询、增删、扫描、Trie 刷新。"""

from datetime import date

import pytest

from app.models.audit import SensitiveWord
from app.schemas.b_end import AddSensitiveWordBody
from app.services import sensitive_service as svc_mod


@pytest.fixture(autouse=True)
def reset_trie():
    svc_mod._trie = None
    svc_mod._trie_version = ""
    yield


@pytest.fixture
def svc(db_session, redis_client):
    return svc_mod.SensitiveService(db_session, redis_client)


async def _create_word(session, **kwargs):
    defaults = {
        "text": "违规词",
        "level": 1,
        "suggestion": "删除",
        "lib_version": date.today().isoformat(),
    }
    defaults.update(kwargs)
    word = SensitiveWord(**defaults)
    session.add(word)
    await session.flush()
    return word


class TestGetLib:
    async def test_get_lib_empty(self, svc):
        lib = await svc.get_lib()
        assert len(lib.words) == 0
        assert lib.meta.total_count == 0

    async def test_get_lib_with_words(self, svc, db_session):
        await _create_word(db_session, text="赌博", level=1)
        await _create_word(db_session, text="广告", level=2)
        lib = await svc.get_lib()
        assert len(lib.words) == 2
        assert lib.meta.total_count == 2
        assert lib.meta.by_level.get("1") == 1
        assert lib.meta.by_level.get("2") == 1

    async def test_get_lib_by_level(self, svc, db_session):
        await _create_word(db_session, text="赌博", level=1)
        await _create_word(db_session, text="广告", level=2)
        await _create_word(db_session, text="推荐", level=3)
        lib = await svc.get_lib()
        assert lib.meta.by_level["1"] == 1
        assert lib.meta.by_level["2"] == 1
        assert lib.meta.by_level["3"] == 1


class TestAddWord:
    async def test_add_word_success(self, svc, db_session):
        body = AddSensitiveWordBody(text="新敏感词", level=2, suggestion="需审核")
        result = await svc.add_word(body)
        assert result.text == "新敏感词"
        assert result.level == 2

    async def test_add_word_refreshes_trie(self, svc, db_session):
        body = AddSensitiveWordBody(text="测试词", level=1, suggestion="高危")
        await svc.add_word(body)
        hits = await svc.scan("包含测试词的内容")
        assert len(hits) == 1
        assert hits[0].text == "测试词"

    async def test_add_duplicate_word(self, svc, db_session):
        from sqlalchemy import select
        body1 = AddSensitiveWordBody(text="重复词", level=1, suggestion="高危")
        await svc.add_word(body1)
        body2 = AddSensitiveWordBody(text="重复词", level=2, suggestion="中危")
        result = await svc.add_word(body2)
        assert result.text == "重复词"
        stmt = select(SensitiveWord).where(SensitiveWord.text == "重复词")
        words = (await db_session.execute(stmt)).scalars().all()
        assert len(words) >= 1


class TestRemoveWord:
    async def test_remove_word_success(self, svc, db_session):
        await _create_word(db_session, text="待删除")
        removed = await svc.remove_word("待删除")
        assert removed is True

    async def test_remove_nonexistent_word(self, svc):
        removed = await svc.remove_word("不存在的词")
        assert removed is False

    async def test_remove_word_by_level(self, svc, db_session):
        await _create_word(db_session, text="敏感", level=1)
        await _create_word(db_session, text="敏感", level=2)
        removed = await svc.remove_word("敏感", level=1)
        assert removed is True

    async def test_remove_word_refreshes_trie(self, svc, db_session):
        body = AddSensitiveWordBody(text="临时词", level=1, suggestion="测试")
        await svc.add_word(body)
        hits = await svc.scan("包含临时词的内容")
        assert len(hits) == 1
        await svc.remove_word("临时词")
        hits = await svc.scan("包含临时词的内容")
        assert len(hits) == 0


class TestScan:
    async def test_scan_clean_text(self, svc):
        hits = await svc.scan("这是正常文本")
        assert len(hits) == 0

    async def test_scan_with_hits(self, svc, db_session):
        body = AddSensitiveWordBody(text="赌博", level=1, suggestion="删除")
        await svc.add_word(body)
        body2 = AddSensitiveWordBody(text="广告", level=2, suggestion="审核")
        await svc.add_word(body2)
        hits = await svc.scan("这里有赌博和广告内容")
        texts = {h.text for h in hits}
        assert "赌博" in texts
        assert "广告" in texts

    async def test_scan_empty_text(self, svc):
        hits = await svc.scan("")
        assert len(hits) == 0

    async def test_scan_auto_loads_trie_from_db(self, svc, db_session):
        body = AddSensitiveWordBody(text="敏感词", level=1, suggestion="删除")
        await svc.add_word(body)
        svc_mod._trie = None
        svc_mod._trie_version = ""
        hits = await svc.scan("包含敏感词的内容")
        assert len(hits) == 1
        assert hits[0].text == "敏感词"


class TestTrieRefresh:
    async def test_trie_refresh_after_add(self, svc, db_session):
        assert svc_mod._trie is None
        body = AddSensitiveWordBody(text="新词", level=1, suggestion="高危")
        await svc.add_word(body)
        assert svc_mod._trie is not None
        assert svc_mod._trie.size == 1

    async def test_trie_refresh_after_remove(self, svc, db_session):
        body = AddSensitiveWordBody(text="待删词", level=1, suggestion="测试")
        await svc.add_word(body)
        assert svc_mod._trie is not None
        assert svc_mod._trie.size == 1
        await svc.remove_word("待删词")
        assert svc_mod._trie.size == 0
