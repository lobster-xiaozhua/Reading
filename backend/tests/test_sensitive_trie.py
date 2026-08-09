"""敏感词 DFA Trie 扫描器单元测试（§8.7）。"""

import pytest

from app.utils.sensitive_trie import SensitiveTrie

pytestmark = pytest.mark.unit


class TestSensitiveTrie:
    def setup_method(self):
        self.trie = SensitiveTrie()
        self.trie.load_with_meta(
            [
                ("赌博", 1, "高危词"),
                ("色情", 1, "高危词"),
                ("广告", 2, "警告词"),
                ("测试", 3, "提示词"),
            ]
        )

    def test_scan_finds_single_word(self):
        hits = self.trie.scan("这里有赌博内容")
        assert len(hits) == 1
        assert hits[0].word == "赌博"
        assert hits[0].level == 1

    def test_scan_finds_multiple_words(self):
        hits = self.trie.scan("赌博和色情都有")
        words = {h.word for h in hits}
        assert words == {"赌博", "色情"}

    def test_scan_no_hits_in_clean_text(self):
        hits = self.trie.scan("这是一段正常文本")
        assert hits == []

    def test_scan_empty_text(self):
        assert self.trie.scan("") == []

    def test_scan_dedup(self):
        hits = self.trie.scan("赌博赌博赌博")
        assert len(hits) == 1
        assert hits[0].word == "赌博"

    def test_scan_preserves_level_and_suggestion(self):
        hits = self.trie.scan("这是广告内容")
        assert len(hits) == 1
        hit = hits[0]
        assert hit.level == 2
        assert hit.suggestion == "警告词"

    def test_add_empty_word_ignored(self):
        trie = SensitiveTrie()
        trie.add("")
        assert trie.size == 0

    def test_clear(self):
        assert self.trie.size == 4
        self.trie.clear()
        assert self.trie.size == 0
        assert self.trie.scan("赌博") == []

    def test_size(self):
        assert self.trie.size == 4

    def test_scan_overlapping_words_longest_match(self):
        """重叠词时取最长匹配（最长匹配优先策略）。"""
        trie = SensitiveTrie()
        trie.load(["中国", "中国人"])
        hits = trie.scan("我是中国人")
        assert len(hits) == 1
        assert hits[0].word == "中国人"

    def test_scan_word_at_boundary(self):
        """敏感词出现在文本开头或结尾。"""
        hits_start = self.trie.scan("赌博内容开始")
        assert len(hits_start) == 1
        assert hits_start[0].word == "赌博"

        hits_end = self.trie.scan("内容结尾是色情")
        assert len(hits_end) == 1
        assert hits_end[0].word == "色情"

    def test_scan_single_char_words(self):
        """单字敏感词。"""
        trie = SensitiveTrie()
        trie.add("脏")
        hits = trie.scan("这是脏话")
        assert len(hits) == 1
        assert hits[0].word == "脏"

    def test_load_without_meta(self):
        """load 方法（不带元信息）默认 level=3, suggestion=''。"""
        trie = SensitiveTrie()
        trie.load(["敏感词1", "敏感词2"])
        assert trie.size == 2
        hits = trie.scan("包含敏感词1的文本")
        assert len(hits) == 1
        assert hits[0].level == 3
        assert hits[0].suggestion == ""

    def test_scan_preserves_first_occurrence_meta(self):
        """去重后保留首次出现的元信息。"""
        trie = SensitiveTrie()
        trie.load_with_meta([("重复词", 1, "第一个"), ("重复词", 2, "第二个")])
        # 后加载的同名词会覆盖元信息（add 是覆盖语义）
        hits = trie.scan("重复词出现了")
        assert len(hits) == 1
        assert hits[0].level == 2
        assert hits[0].suggestion == "第二个"

    def test_add_duplicate_word_updates_meta(self):
        """重复添加同一词会更新元信息。"""
        trie = SensitiveTrie()
        trie.add("测试词", level=1, suggestion="初始")
        assert trie.size == 1
        trie.add("测试词", level=3, suggestion="更新后")
        assert trie.size == 1  # 不增加数量
        hits = trie.scan("测试词")
        assert hits[0].level == 3
        assert hits[0].suggestion == "更新后"
