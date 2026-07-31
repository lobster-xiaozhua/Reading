// 将 src/styles/*.css 复制到 dist/styles，不做转换（已是标准 CSS 变量）
import { cpSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src', 'styles');
const outDir = join(__dirname, '..', 'dist', 'styles');

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let count = 0;
for (const file of readdirSync(srcDir)) {
  if (file.endsWith('.css')) {
    cpSync(join(srcDir, file), join(outDir, file));
    count++;
  }
}
console.log(`[tokens:css] copied ${count} css files → dist/styles`);
