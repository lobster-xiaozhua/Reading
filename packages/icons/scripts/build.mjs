// 生成 src/icons.tsx：每个图标一个组件 + 按类别分组导出 + 全量聚合导出
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from '../src/icons-meta.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = join(__dirname, '..', 'src', 'icons.tsx');
if (!existsSync(dirname(outFile))) mkdirSync(dirname(outFile), { recursive: true });

const used = new Set();
function unique(name) {
  let n = name;
  let i = 1;
  while (used.has(n)) { n = `${name}${i++}`; }
  used.add(n);
  return n;
}

/* 生成每个图标组件 */
const components = [];
for (const icon of ICONS) {
  const exportName = unique(icon.exportName);
  const filledAttrs = icon.filled
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none"';
  components.push(`/**
 * ${icon.desc} · icon-${icon.kebab}
 */
export const ${exportName} = memo(function ${exportName}(props: IconProps) {
  return (
    <Icon {...props}>
      ${icon.body.replace(/fill="currentColor" stroke="none"/g, filledAttrs)}
    </Icon>
  );
});`);
}

/* 按类别分组导出 */
const categories = [...new Set(ICONS.map((i) => i.category))];
const groupExports = [];
for (const cat of categories) {
  const members = ICONS.filter((i) => i.category === cat);
  groupExports.push(`export const ${cat}Icons = {
${members.map((i) => `  ${i.exportName},`).join('\n')}
} as const;`);
}

/* 聚合导出（含全部 85 个图标的 record） */
const allExports = ICONS.map((i) => `  ${i.exportName},`).join('\n');
const kebabRecord = ICONS.map((i) => `  '${i.kebab}': ${i.exportName},`).join('\n');

const file = `/* ============================================================
 * Atlas Design System · Icons · 自动生成
 * 60 通用 + 25 小说专用 = 85 个图标
 * 规范：24×24 viewbox / 1.8px 描边 / currentColor / round linecap
 * 生成器：scripts/build.mjs（基于 src/icons-meta.ts）
 * ============================================================ */

import { memo } from 'react';
import { Icon, type IconProps } from './Icon.js';

${components.join('\n\n')}

/* ---------- 按类别分组导出 ---------- */
${groupExports.join('\n\n')}

/* ---------- 聚合导出 ---------- */
export const allIcons = {
${allExports}
} as const;

/** 按 kebab-case 名称查找图标组件 */
export const iconsByKebab: Record<string, (props: IconProps) => ReturnType<typeof Icon>> = {
${kebabRecord}
};

export type IconComponent = (props: IconProps) => ReturnType<typeof Icon>;
`;

writeFileSync(outFile, file, 'utf8');
console.log(`[icons:build] 生成 ${ICONS.length} 个图标 → src/icons.tsx`);
