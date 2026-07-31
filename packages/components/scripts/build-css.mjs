// 将 src/styles/index.css 及其 @import 递归内联成单一 dist/styles.css
// 不做转换（已是标准 CSS 变量），仅做 @import 内联与注释清理
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src', 'styles');
const outFile = join(__dirname, '..', 'dist', 'styles.css');

mkdirSync(dirname(outFile), { recursive: true });

const IMPORT_RE = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g;

function inline(file, seen = new Set()) {
  const abs = resolve(file);
  if (seen.has(abs)) return ''; // 防止循环引用
  seen.add(abs);
  let content = readFileSync(abs, 'utf8');
  const baseDir = dirname(abs);
  content = content.replace(IMPORT_RE, (match, ref) => {
    // 仅处理相对路径的 @import
    if (ref.startsWith('.') || ref.startsWith('/')) {
      const target = join(baseDir, ref);
      return inline(target, seen);
    }
    return match;
  });
  return content;
}

const result = inline(join(srcDir, 'index.css'));

if (!existsSync(outFile) || readFileSync(outFile, 'utf8') !== result) {
  writeFileSync(outFile, result);
  console.log(`[components:css] inlined styles → dist/styles.css (${result.length} bytes)`);
} else {
  console.log(`[components:css] dist/styles.css up to date`);
}
