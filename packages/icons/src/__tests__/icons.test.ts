import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../icons-meta.mjs';

test('图标总数 = 60 通用 + 25 小说 = 85', () => {
  assert.equal(ICONS.length, 85, `应为 85 个图标，实际 ${ICONS.length}`);
});

test('通用图标 60 个分布正确', () => {
  const general = ICONS.filter((i) => i.category !== 'novel');
  assert.equal(general.length, 60);

  const byCat = new Map<string, number>();
  for (const i of general) {
    byCat.set(i.category, (byCat.get(i.category) ?? 0) + 1);
  }
  // 02 文档 §3.2 各类别数量
  assert.equal(byCat.get('action'), 15);
  assert.equal(byCat.get('navigation'), 8);
  assert.equal(byCat.get('status'), 8);
  assert.equal(byCat.get('content'), 12);
  assert.equal(byCat.get('media'), 4);
  assert.equal(byCat.get('communication'), 5);
  assert.equal(byCat.get('editor'), 4);
  assert.equal(byCat.get('system'), 4);
});

test('小说专用图标 25 个分布正确', () => {
  const novel = ICONS.filter((i) => i.category === 'novel');
  assert.equal(novel.length, 25);

  // 03 文档 §3.3 各类别数量：阅读5 + 章节4 + 互动6 + 状态5 + 阅读设置5
  const expected = ['book-open', 'book-closed', 'bookmark', 'bookmark-filled', 'reading-glasses',
    'chapter-list', 'chapter-next', 'chapter-prev', 'chapter-lock',
    'heart', 'heart-filled', 'thumbs-up', 'comment', 'share', 'reward',
    'fire', 'crown', 'medal', 'trending-up', 'trending-down',
    'moon', 'sun', 'eye', 'text-size', 'line-spacing'];
  const kebabs = novel.map((i) => i.kebab.replace(/^novel-/, ''));
  for (const e of expected) {
    assert.ok(kebabs.includes(e), `应含 novel-${e}`);
  }
});

test('所有图标 kebab 命名唯一', () => {
  const seen = new Set<string>();
  for (const i of ICONS) {
    assert.ok(!seen.has(i.kebab), `kebab 重复：${i.kebab}`);
    seen.add(i.kebab);
  }
});

test('所有图标 exportName 唯一', () => {
  const seen = new Set<string>();
  for (const i of ICONS) {
    assert.ok(!seen.has(i.exportName), `exportName 重复：${i.exportName}`);
    seen.add(i.exportName);
  }
});

test('实心变体使用 -filled 后缀且 body 含 fill="currentColor"', () => {
  const filled = ICONS.filter((i) => i.filled);
  assert.ok(filled.length >= 2, '至少有 bookmark-filled 与 heart-filled');
  for (const i of filled) {
    assert.ok(i.kebab.endsWith('-filled'), `${i.kebab} 应使用 -filled 后缀`);
    assert.match(i.body, /fill="currentColor"/, `${i.kebab} body 应含 fill="currentColor"`);
  }
});
