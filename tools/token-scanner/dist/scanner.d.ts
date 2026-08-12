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
export declare function scan(opts: ScannerOptions): ScanResult;
//# sourceMappingURL=scanner.d.ts.map