export interface ImportAuditOptions {
    /** 扫描根目录（apps/admin 绝对路径） */
    root: string;
}
export interface ImportViolation {
    file: string;
    line: number;
    message: string;
    snippet: string;
}
export interface ImportAuditResult {
    violations: ImportViolation[];
    scannedFiles: number;
    passed: boolean;
}
export declare function auditImports(opts: ImportAuditOptions): ImportAuditResult;
//# sourceMappingURL=import-audit.d.ts.map