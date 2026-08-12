/**
 * 纯文字字数（不含标点）
 * - 中文逐字计数
 * - 英文连续字母算 1 词
 * - 数字连续算 1 词
 * - 标点空白不计
 */
export declare function countPureWords(text: string): number;
/**
 * 含标点字数（稿费结算口径）
 * - 在纯文字基础上，标点也计入
 * - 空白字符（空格/换行/制表符）不计
 */
export declare function countWithPunctuation(text: string): number;
/** 双口径字数统计 */
export declare function countWords(text: string): {
    pure: number;
    withPunctuation: number;
};
//# sourceMappingURL=word-count.d.ts.map