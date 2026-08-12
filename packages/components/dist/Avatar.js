import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * Avatar · 02 §1.10
 * 图片 / 首字兜底；3 尺寸；2 形状
 * ============================================================ */
import { useState } from "react";
export function Avatar({ src, alt = "", size = "md", shape = "circle", className, ...rest }) {
    const [failed, setFailed] = useState(false);
    const cls = [
        "novel-avatar",
        `novel-avatar--${size}`,
        `novel-avatar--${shape}`,
        className ?? "",
    ]
        .filter(Boolean)
        .join(" ");
    // 首字兜底：取 alt 第一个字符（中文/英文皆可）
    const initial = alt.trim().charAt(0) || "?";
    return (_jsx("span", { className: cls, role: "img", "aria-label": alt || "头像", children: src && !failed ? (_jsx("img", { className: "novel-avatar__img", src: src, alt: alt, onError: () => setFailed(true), ...rest })) : (_jsx("span", { "aria-hidden": true, children: initial.toUpperCase() })) }));
}
//# sourceMappingURL=Avatar.js.map