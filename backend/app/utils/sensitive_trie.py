"""DFA Trie 敏感词扫描（§8.7）。

启动时加载词库到 Trie 树，章节/评论提交时调用 ``scan`` 返回命中词列表。
"""

from dataclasses import dataclass


@dataclass
class SensitiveHit:
    word: str
    level: int = 3
    suggestion: str = ""


class SensitiveTrie:
    """基于 DFA Trie 的敏感词匹配器。"""

    _END = "\x00"

    def __init__(self) -> None:
        self._root: dict = {}
        # 词级别元信息（level/suggestion）
        self._meta: dict[str, tuple[int, str]] = {}

    def add(self, word: str, level: int = 3, suggestion: str = "") -> None:
        word = word.strip()
        if not word:
            return
        node = self._root
        for ch in word:
            node = node.setdefault(ch, {})
        node[self._END] = True
        self._meta[word] = (level, suggestion)

    def load(self, words: list[str]) -> None:
        for w in words:
            self.add(w)

    def load_with_meta(self, items: list[tuple[str, int, str]]) -> None:
        for word, level, suggestion in items:
            self.add(word, level, suggestion)

    def scan(self, text: str) -> list[SensitiveHit]:
        """扫描文本，返回命中的敏感词（去重，保留首次元信息）。"""
        if not text:
            return []

        hits: list[SensitiveHit] = []
        seen: set[str] = set()
        n = len(text)
        i = 0

        while i < n:
            node = self._root
            j = i
            last_hit_end = -1
            while j < n and text[j] in node:
                node = node[text[j]]
                j += 1
                if self._END in node:
                    last_hit_end = j
            if last_hit_end > 0:
                word = text[i:last_hit_end]
                if word not in seen:
                    seen.add(word)
                    level, suggestion = self._meta.get(word, (3, ""))
                    hits.append(SensitiveHit(word=word, level=level, suggestion=suggestion))
                i = last_hit_end
            else:
                i += 1
        return hits

    def clear(self) -> None:
        self._root = {}
        self._meta = {}

    @property
    def size(self) -> int:
        return len(self._meta)
