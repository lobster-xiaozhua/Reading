import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan, type Violation } from '../scanner';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeFixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'scanner-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(full.slice(0, full.lastIndexOf('/')), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return dir;
}

test('检测到组件中的裸色值', () => {
  const dir = makeFixture({
    'components/Button.tsx': `export const Button = () => <button style={{ color: '#1890FF' }} />;`,
  });
  const result = scan({ root: dir });
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, 'raw-color');
  assert.equal(result.passed, false);
});

test('豁免 tokens 包自身的 CSS 定义', () => {
  const dir = makeFixture({
    'packages/tokens/src/styles/primitive.css': `:root { --brand-7: #1890FF; }`,
  });
  const result = scan({ root: dir });
  assert.equal(result.violations.length, 0, '令牌定义文件应豁免');
});

test('检测到 SVG 硬编码 fill', () => {
  const dir = makeFixture({
    'icons/star.svg': `<svg><path fill="#F5222D" d="..."/></svg>`,
  });
  const result = scan({ root: dir });
  const svgV = result.violations.filter((v: Violation) => v.rule === 'svg-hardcoded-color');
  assert.equal(svgV.length, 1);
  assert.match(svgV[0].message, /currentColor/);
});

test('检测到非令牌间距（如 17px）', () => {
  const dir = makeFixture({
    'components/Card.tsx': `export const Card = () => <div style={{ padding: '17px' }} />;`,
  });
  const result = scan({ root: dir });
  const spacingV = result.violations.filter((v: Violation) => v.rule === 'non-token-spacing');
  assert.equal(spacingV.length, 1);
  assert.match(spacingV[0].message, /17px/);
});

test('允许令牌集合内的间距（如 16px）', () => {
  const dir = makeFixture({
    'components/Card.tsx': `export const Card = () => <div style={{ gap: '16px' }} />;`,
  });
  const result = scan({ root: dir });
  const spacingV = result.violations.filter((v: Violation) => v.rule === 'non-token-spacing');
  assert.equal(spacingV.length, 0, '16px 在 --space-4 集合内，应通过');
});
