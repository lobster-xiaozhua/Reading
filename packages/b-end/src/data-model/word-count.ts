/* ============================================================
 * P2-21 · 字数统计工具（双口径）
 * - countPureWords：去除标点，纯文字字数（C 端阅读进度用）
 * - countWithPunctuation：含标点字数（B 端稿费结算口径，04 §6.21）
 *
 * 中文字符按 1 字计；英文连续字母按 1 词计（与中文写作平台惯例一致）
 * Source: 04-B端开发计划.md P2-21 / P8-2 稿费口径
 * ============================================================ */

/** 中文/日文/韩文统一表意文字 + 扩展区 */
const CJK_RE =
  /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;

/** 标点符号（中英文） */
const PUNCTUATION_RE =
  /[\s\u3000-\u303f\uff00-\uffef，。、；：？！,.;:!?"'""''（）()【】《》〈〉…—./]/;

/**
 * 纯文字字数（不含标点）
 * - 中文逐字计数
 * - 英文连续字母算 1 词
 * - 数字连续算 1 词
 * - 标点空白不计
 */
export function countPureWords(text: string): number {
  if (!text) return 0;
  // 先剥离 HTML 标签（章节正文是 HTML）
  const plain = text.replace(/<[^>]*>/g, "");
  let count = 0;
  let inLatinWord = false;
  let inDigitWord = false;

  for (const ch of plain) {
    if (CJK_RE.test(ch)) {
      count++;
      inLatinWord = false;
      inDigitWord = false;
      continue;
    }
    if (PUNCTUATION_RE.test(ch)) {
      inLatinWord = false;
      inDigitWord = false;
      continue;
    }
    // 英文字母
    if (/[a-zA-Z]/.test(ch)) {
      if (!inLatinWord) {
        count++;
        inLatinWord = true;
      }
      inDigitWord = false;
      continue;
    }
    // 数字
    if (/[0-9]/.test(ch)) {
      if (!inDigitWord) {
        count++;
        inDigitWord = true;
      }
      inLatinWord = false;
      continue;
    }
    // 其他可见字符（如 emoji）按 1 计
    if (!inLatinWord && !inDigitWord) {
      count++;
    }
  }
  return count;
}

/**
 * 含标点字数（稿费结算口径）
 * - 在纯文字基础上，标点也计入
 * - 空白字符（空格/换行/制表符）不计
 */
export function countWithPunctuation(text: string): number {
  if (!text) return 0;
  const plain = text.replace(/<[^>]*>/g, "");
  let count = 0;
  for (const ch of plain) {
    // 空白不计
    if (/\s/.test(ch)) continue;
    count++;
  }
  return count;
}

/** 双口径字数统计 */
export function countWords(text: string): {
  pure: number;
  withPunctuation: number;
} {
  return {
    pure: countPureWords(text),
    withPunctuation: countWithPunctuation(text),
  };
}
