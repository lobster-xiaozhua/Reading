"""敏感词 DFA Trie 扫描器单元测试（§8.7）。"""

from app.utils.sensitive_trie import SensitiveTrie


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
