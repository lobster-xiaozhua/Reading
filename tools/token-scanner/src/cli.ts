#!/usr/bin/env node
/* ============================================================
 * Atlas Design System · Token Scanner CLI
 * 用法：token-scanner --root <path> [--ignore <path> ...]
 * 退出码：0 通过 / 1 有违规
 * ============================================================ */

import { scan } from './scanner.js';
import { resolve } from 'node:path';

function parseArgs(argv: string[]): { root: string; ignore: string[] } {
  const args = argv.slice(2).filter((a) => a !== '--');
  let root = process.cwd();
  const ignore: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--root' || a === '-r') {
      root = args[++i];
    } else if (a === '--ignore' || a === '-i') {
      ignore.push(args[++i]);
    } else if (a === '--help' || a === '-h') {
      console.log('用法: token-scanner --root <path> [--ignore <path> ...]');
      process.exit(0);
    }
  }
  return { root: resolve(root), ignore };
}

const { root, ignore } = parseArgs(process.argv);

// 默认豁免：令牌定义文件、第三方依赖、构建产物、scanner 自身源码、测试 fixture、Mock 数据
const defaultIgnore = [
  'node_modules',
  'dist',
  'build',
  '.cache',
  'packages/tokens/src',
  'packages/tokens/dist',
  'tools/token-scanner/src',
  'tools/token-scanner/dist',
  // 测试 fixture 经常需要色值字符串来验证扫描器自身
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  // P5 Mock 数据：封面占位图色值由 hue 动态生成，属数据而非样式；P6 接真实 API 后移除
  'apps/web/src/api/mockData.ts',
];

const result = scan({
  root,
  ignore: [...defaultIgnore, ...ignore],
  strictSvg: true,
});

console.log(`\n[scanner] 扫描 ${result.scannedFiles} 个文件`);

if (result.passed) {
  console.log('[scanner] ✓ 通过，未发现违规');
  process.exit(0);
}

console.error(`[scanner] ✗ 发现 ${result.violations.length} 处违规：\n`);
const grouped = new Map<string, typeof result.violations>();
for (const v of result.violations) {
  if (!grouped.has(v.file)) grouped.set(v.file, []);
  grouped.get(v.file)!.push(v);
}
for (const [file, vs] of grouped) {
  console.error(`  ${file}`);
  for (const v of vs) {
    console.error(`    L${v.line}:${v.col}  [${v.rule}] ${v.message}`);
    console.error(`    └─ ${v.snippet}`);
  }
  console.error('');
}
process.exit(1);
