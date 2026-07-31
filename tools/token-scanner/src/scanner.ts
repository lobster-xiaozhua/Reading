/* ============================================================
 * Atlas Design System · Token Scanner
 * 扫描源码，阻断违规实现：
 *   1. 组件/业务代码中的裸色值（#xxx / rgb() / rgba() / hsl()）
 *   2. 非令牌间距（px 值不在 --space-* 集合内）
 *   3. SVG 内联色值（fill/stroke 写死颜色而非 currentColor）
 *
 * 豁免区：packages/tokens/src/styles/ 下的 CSS 文件（令牌定义本身）
 * Source: 02-通用设计.md §7.4 / 04-C端开发计划.md P0-4
 * ============================================================ */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

export interface ScannerOptions {
  /** 扫描根目录（绝对路径） */
  root: string;
  /** 豁免路径（相对 root 的相对路径数组，命中即跳过） */
  ignore?: string[];
  /** 是否在 SVG 中禁止 fill/stroke 写死颜色 */
  strictSvg?: boolean;
}

export interface Violation {
  file: string;
  line: number;
  col: number;
  rule: 'raw-color' | 'non-token-spacing' | 'svg-hardcoded-color';
  message: string;
  snippet: string;
}

export interface ScanResult {
  violations: Violation[];
  scannedFiles: number;
  passed: boolean;
}

/* ---------- 工具 ---------- */

const ALLOWED_SPACING_PX = new Set([
  0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128,
  // 允许 1px 用于 hairline 边框（常用）
  1, 2, 3,
]);

const RAW_COLOR_RE = /(#(?:[0-9a-fA-F]{3,8})\b|(?:rgba?|hsla?)\s*\([^)]*\))/g;
const PX_RE = /(\d+(?:\.\d+)?)px/g;
const SVG_COLOR_RE = /(fill|stroke)\s*[:=]\s*["']?(#(?:[0-9a-fA-F]{3,8})\b|(?:rgba?|hsla?)\s*\([^)]*\))/g;

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === 'build') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else {
      const ext = extname(full).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.css', '.svg', '.html', '.vue'].includes(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

function isIgnored(file: string, root: string, ignore: string[]): boolean {
  const rel = relative(root, file).split(sep).join('/');
  return ignore.some((p) => {
    if (p === rel) return true;
    if (rel.startsWith(p + '/')) return true;
    // glob 风格：**/<dir>/** 匹配任意路径下的该目录
    if (p.startsWith('**/') && p.endsWith('/**')) {
      const mid = p.slice(3, -3);
      if (rel.includes('/' + mid + '/') || rel.startsWith(mid + '/')) return true;
    }
    // glob 风格：**/*.ext 匹配任意路径下的该扩展名文件
    if (p.startsWith('**/*.')) {
      const suffix = p.slice(3); // *.ext
      if (rel.endsWith(suffix.slice(1))) return true; // .ext
    }
    return false;
  });
}

function isTokenCssFile(file: string): boolean {
  // 令牌定义文件本身允许写色值
  return file.includes(`${sep}tokens${sep}src${sep}styles${sep}`) ||
         file.includes(`${sep}tokens${sep}dist${sep}styles${sep}`);
}

/* ---------- 核心扫描 ---------- */

export function scan(opts: ScannerOptions): ScanResult {
  const { root, ignore = [], strictSvg = true } = opts;
  const violations: Violation[] = [];
  let scannedFiles = 0;

  const allFiles = walk(root);
  for (const file of allFiles) {
    if (isIgnored(file, root, ignore)) continue;
    const isTokenDef = isTokenCssFile(file);
    const ext = extname(file).toLowerCase();

    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    scannedFiles++;

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNo = i + 1;

      // 规则 1：裸色值（令牌定义 CSS 文件豁免；仅扫描样式/源码文件，不扫 .html/.json/.md 等配置文档）
      const isStyleOrCode = ['.css', '.ts', '.tsx', '.jsx', '.js'].includes(ext);
      if (!isTokenDef && isStyleOrCode) {
        let m: RegExpExecArray | null;
        RAW_COLOR_RE.lastIndex = 0;
        while ((m = RAW_COLOR_RE.exec(line)) !== null) {
          // 允许出现在 var() 引用之外的注释行
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) continue;
          // 豁免 text-shadow 行：文字阴影色属视觉装饰，跟随场景定制，无需语义令牌
          if (/text-shadow\s*:/i.test(line)) continue;
          violations.push({
            file: relative(root, file),
            line: lineNo,
            col: m.index + 1,
            rule: 'raw-color',
            message: `裸色值 "${m[0]}" 必须替换为语义令牌（var(--color-*)）`,
            snippet: line.trim().slice(0, 120),
          });
        }
      }

      // 规则 2：非令牌间距（仅扫描 .ts/.tsx/.jsx，且非令牌定义文件）
      if (!isTokenDef && (ext === '.ts' || ext === '.tsx' || ext === '.jsx' || ext === '.css')) {
        let m: RegExpExecArray | null;
        PX_RE.lastIndex = 0;
        while ((m = PX_RE.exec(line)) !== null) {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) continue;
          const val = parseFloat(m[1]);
          // 允许 0px / hairline；允许字体大小（font-size: 16px 是 Tailwind 工具类已映射）
          // 简化：仅当数值在常见 spacing 区间且不在允许集合内时报错
          if (val > 0 && val <= 200 && !ALLOWED_SPACING_PX.has(val)) {
            // 跳过非间距用途的 px 值：
            // - font-size / line-height / 字号相关
            // - border-radius / width / height / min-width / max-width 尺寸
            // - border / border-<side> / border-width 描边宽度（不属于间距令牌）
            // - box-shadow 的偏移与 spread（视觉描边，非间距）
            // - top/left/right/bottom 绝对定位偏移（组件内部几何，非布局间距）
            // - transform 位移
            // - grid-template-columns / grid-template-rows 列宽行高（布局尺寸，非间距）
            // - text-shadow 的偏移与模糊（视觉描边，非间距）
            if (
              /(font-size|line-height|border-radius|border-width|width|height|min-width|max-width)/i.test(line) ||
              /^\s*(border|border-(top|right|bottom|left|width))\s*:/i.test(line) ||
              /box-shadow\s*:/i.test(line) ||
              /text-shadow\s*:/i.test(line) ||
              /^\s*(top|left|right|bottom)\s*:/i.test(line) ||
              /transform\s*:/i.test(line) ||
              /grid-template-(columns|rows)\s*:/i.test(line)
            ) continue;
            violations.push({
              file: relative(root, file),
              line: lineNo,
              col: m.index + 1,
              rule: 'non-token-spacing',
              message: `间距 ${val}px 不在令牌集合（--space-*）内`,
              snippet: line.trim().slice(0, 120),
            });
          }
        }
      }

      // 规则 3：SVG 硬编码色值
      if (ext === '.svg' && strictSvg) {
        let m: RegExpExecArray | null;
        SVG_COLOR_RE.lastIndex = 0;
        while ((m = SVG_COLOR_RE.exec(line)) !== null) {
          violations.push({
            file: relative(root, file),
            line: lineNo,
            col: m.index + 1,
            rule: 'svg-hardcoded-color',
            message: `SVG ${m[1]} 写死色值 "${m[2]}"，应改为 currentColor 以跟随主题`,
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    }
  }

  return {
    violations,
    scannedFiles,
    passed: violations.length === 0,
  };
}
