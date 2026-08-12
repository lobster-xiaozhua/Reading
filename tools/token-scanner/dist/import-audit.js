/* ============================================================
 * P0-10 · B 端导入审计脚本（审查 #1 强制措施 #3）
 * 阻断 apps/admin 与 packages/b-end 源码中违规导入 @novel/components 基础组件
 *
 * 规则：
 *   - 禁止：import { Button, Input, Modal, ... } from '@novel/components'
 *   - 禁止：import { Button } from '@novel/components/Button'
 *   - 允许：import { useAsyncState } from '@novel/components/useAsyncState'
 *   - 允许：从 'antd' 导入基础组件
 *
 * 用法：node dist/import-audit.js --root <apps/admin 路径>
 * 退出码：0 通过 / 1 有违规
 * ============================================================ */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
/**
 * @novel/components 基础组件黑名单（B 端禁用，详见 04-B端开发计划.md §0.3）
 */
const FORBIDDEN_COMPONENTS = new Set([
    'Button',
    'Input',
    'InputPassword',
    'InputNumber',
    'Select',
    'Modal',
    'Drawer',
    'Tabs',
    'Tag',
    'Badge',
    'Tooltip',
    'Popover',
    'Dropdown',
    'Avatar',
    'Switch',
    'Checkbox',
    'Radio',
    'Alert',
    'Message',
    'Notification',
    'EmptyState',
    'Skeleton',
    'Pagination',
    // C 端业务组件（B 端一般禁用，除非评估后显式放行）
    'BookCard',
    'Bookshelf',
    'ChapterList',
    'Reader',
    'ReaderSettings',
    'RankingBoard',
    'TagCloud',
    'Comment',
    'RewardButton',
    'BookRecommend',
    'ReadingProgress',
    'RatingStars',
    'NotificationBadge',
]);
/**
 * 匹配违规导入语句
 * 形如：import { Button, Input } from '@novel/components'
 *      import { Button } from '@novel/components/Button'
 */
const IMPORT_RE = /import\s+(?:type\s+)?(?:\{([^}]*)\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]@novel\/components(\/[^'"]*)?['"]/g;
function walk(dir, files = []) {
    let entries;
    try {
        entries = readdirSync(dir);
    }
    catch {
        return files;
    }
    for (const entry of entries) {
        if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === 'build')
            continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            walk(full, files);
        }
        else {
            const ext = extname(full).toLowerCase();
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
                files.push(full);
            }
        }
    }
    return files;
}
export function auditImports(opts) {
    const { root } = opts;
    const violations = [];
    let scannedFiles = 0;
    const allFiles = walk(root);
    for (const file of allFiles) {
        let content;
        try {
            content = readFileSync(file, 'utf8');
        }
        catch {
            continue;
        }
        scannedFiles++;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            IMPORT_RE.lastIndex = 0;
            let m;
            while ((m = IMPORT_RE.exec(line)) !== null) {
                const importPath = m[2]; // 如 undefined 或 '/Button'
                const namedImports = m[1]; // 如 'Button, Input'
                // 允许：@novel/components/useAsyncState（子路径 Hook）
                if (importPath && importPath.startsWith('/useAsyncState')) {
                    continue;
                }
                // 禁止：@novel/components/Button 这种子路径直接导入基础组件
                if (importPath) {
                    const compName = importPath.slice(1).split('/')[0];
                    if (FORBIDDEN_COMPONENTS.has(compName)) {
                        violations.push({
                            file: relative(root, file),
                            line: i + 1,
                            message: `禁止从 @novel/components 子路径导入基础组件 "${compName}"，请改用 antd`,
                            snippet: line.trim().slice(0, 120),
                        });
                        continue;
                    }
                }
                // 检查命名导入中是否含禁用组件
                if (namedImports) {
                    const imports = namedImports
                        .split(',')
                        .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
                        .filter(Boolean);
                    for (const imp of imports) {
                        if (FORBIDDEN_COMPONENTS.has(imp)) {
                            violations.push({
                                file: relative(root, file),
                                line: i + 1,
                                message: `禁止从 @novel/components 导入基础组件 "${imp}"，请改从 antd 导入（详见 04-B端开发计划.md §0.3）`,
                                snippet: line.trim().slice(0, 120),
                            });
                        }
                    }
                }
                // 禁止：import * as X from '@novel/components'（通配导入无法静态分析，一律阻断）
                if (!namedImports && /\*\s+as\s+/.test(line) && !importPath) {
                    violations.push({
                        file: relative(root, file),
                        line: i + 1,
                        message: `禁止通配导入 @novel/components（含基础组件），请改从 antd 按需导入`,
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
/* ---------- CLI 入口 ---------- */
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    let root = process.cwd();
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--root' || args[i] === '-r') {
            root = args[++i];
        }
        else if (args[i] === '--help' || args[i] === '-h') {
            console.log('用法: import-audit --root <apps/admin 路径>');
            process.exit(0);
        }
    }
    const result = auditImports({ root: resolve(root) });
    console.log(`\n[import-audit] 扫描 ${result.scannedFiles} 个文件`);
    if (result.passed) {
        console.log('[import-audit] ✓ 通过，未发现违规导入');
        process.exit(0);
    }
    console.error(`[import-audit] ✗ 发现 ${result.violations.length} 处违规导入：\n`);
    const grouped = new Map();
    for (const v of result.violations) {
        if (!grouped.has(v.file))
            grouped.set(v.file, []);
        grouped.get(v.file).push(v);
    }
    for (const [file, vs] of grouped) {
        console.error(`  ${file}`);
        for (const v of vs) {
            console.error(`    L${v.line}  ${v.message}`);
            console.error(`    └─ ${v.snippet}`);
        }
        console.error('');
    }
    process.exit(1);
}
//# sourceMappingURL=import-audit.js.map