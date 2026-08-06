/* ============================================================
 * generateDefaultCover · 程序化生成默认书籍封面
 * 纯函数，无外部依赖，返回 SVG data URL
 * ============================================================ */

/** 16 组渐变色（模仿国漫/小说封面风格） */
const COVER_GRADIENTS: [string, string][] = [
  ["#667eea", "#764ba2"],   // 紫蓝
  ["#f093fb", "#f5576c"],   // 粉红
  ["#4facfe", "#00f2fe"],   // 青蓝
  ["#43e97b", "#38f9d7"],   // 青绿
  ["#fa709a", "#fee140"],   // 粉黄
  ["#a18cd1", "#fbc2eb"],   // 浅紫
  ["#fccb90", "#d57eeb"],   // 橙紫
  ["#e0c3fc", "#8ec5fc"],   // 紫蓝(浅)
  ["#f5576c", "#ff6f91"],   // 红粉
  ["#667eea", "#a8edea"],   // 蓝绿
  ["#ffecd2", "#fcb69f"],   // 杏色
  ["#89f7fe", "#66a6ff"],   // 天蓝
  ["#fddb92", "#d1fdff"],   // 米白
  ["#c1dfc4", "#deecdd"],   // 灰绿
  ["#d299c2", "#fef9d7"],   // 粉白
  ["#a1c4fd", "#c2e9fb"],   // 淡蓝
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 根据标题生成稳定颜色索引 */
function pickGradient(title: string): [string, string] {
  const idx = hashCode(title) % COVER_GRADIENTS.length;
  const gradient = COVER_GRADIENTS[idx];
  if (!gradient) return ["#667eea", "#764ba2"];
  return gradient;
}

/** 获取标题首字符（ASCII 用首字母，CJK 用首字） */
function getInitial(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "?";
  const ch = trimmed[0]!;
  if (/[\u4e00-\u9fff]/.test(ch)) return ch;
  return ch.toUpperCase();
}

/**
 * 生成 SVG 默认封面 data URL
 * @param title 书籍标题
 * @param author 可选作者名
 * @returns data:image/svg+xml;base64,...
 */
export function generateCoverSvgDataUrl(title: string, author?: string): string {
  const [color1, color2] = pickGradient(title);
  const initial = getInitial(title);
  const escapedTitle = title.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
  const escapedAuthor = author ? author.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  ) : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1}"/>
      <stop offset="100%" style="stop-color:${color2}"/>
    </linearGradient>
    <linearGradient id="shade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:0.3"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#bg)" rx="8"/>
  <rect width="400" height="600" fill="url(#shade)" rx="8"/>
  <text x="200" y="280" text-anchor="middle" dominant-baseline="central"
    font-family="serif" font-size="120" font-weight="bold"
    fill="rgba(255,255,255,0.85)">${initial}</text>
  <text x="200" y="420" text-anchor="middle" dominant-baseline="central"
    font-family="sans-serif" font-size="22" font-weight="500"
    fill="rgba(255,255,255,0.9)">${escapedTitle}</text>
  ${escapedAuthor ? `<text x="200" y="460" text-anchor="middle" dominant-baseline="central"
    font-family="sans-serif" font-size="14" fill="rgba(255,255,255,0.6)">${escapedAuthor}</text>` : ""}
</svg>`;

  // 浏览器安全的 base64 编码
  const encoded = typeof window !== "undefined"
    ? window.btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}