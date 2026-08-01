import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokens } from '../index';

test('tokens 对象包含完整的 L1 Primitive 色阶', () => {
  assert.equal(tokens.color.brand.brand7, '#1890FF', '主品牌色应为 #1890FF');
  assert.equal(tokens.color.accent.accent7, '#245BFF', 'C 端强调色应为 #245BFF');
  assert.equal(tokens.color.gray.gray14, '#0A0B12', '最深中性色应为 #0A0B12');
  assert.equal(tokens.color.gray.gray1, '#F7F7F8', '最浅中性色应为 #F7F7F8');
  // 14 级 gray 完整性
  const gray = tokens.color.gray as Record<string, string>;
  for (let i = 1; i <= 14; i++) {
    assert.ok(gray[`gray${i}`], `gray${i} 应存在`);
  }
});

test('tokens 对象的 L2 Semantic 引用 L1（var() 形式）', () => {
  assert.equal(tokens.color.semantic.brand, 'var(--brand-7)');
  assert.equal(tokens.color.semantic.accent, 'var(--accent-7)');
  assert.equal(tokens.color.semantic.textPrimary, 'var(--gray-14)');
  assert.equal(tokens.color.semantic.bgPage, 'var(--gray-1)');
});

test('阅读主题令牌 4 套完整', () => {
  const { read } = tokens.color;
  assert.equal(read.bgDay, '#FFFFFF');
  assert.equal(read.bgNight, '#1A1A1A');
  assert.equal(read.bgSepia, '#F5EDDC');
  assert.equal(read.bgParchment, '#F4ECD8');
});

test('间距系统 13 档完整', () => {
  const expected = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
  const space = tokens.space as Record<string, string>;
  for (const n of expected) {
    assert.ok(space[`space${n}`], `space${n} 应存在`);
  }
  assert.equal(tokens.space.space4, '16px');
});

test('动效时长符合 Doherty 阈值（instant ≤ 100ms）', () => {
  const instant = parseInt(tokens.motion.duration.instant, 10);
  assert.ok(instant <= 100, 'dur-instant 必须 ≤ 100ms 以满足 Doherty 阈值');
});

test('圆角 8 档完整', () => {
  const keys = ['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'full'] as const;
  const radius = tokens.radius as Record<string, string>;
  for (const k of keys) {
    assert.ok(radius[k], `radius.${k} 应存在`);
  }
});
