import { jsx as _jsx } from "react/jsx-runtime";
/* ============================================================
 * P2-9 · BUpload · B 端上传封装
 * 基于 Ant Design Upload，透传 props 并提供 beforeUpload 校验工具。
 * Source: 04-B端开发计划.md P2-9
 * ============================================================ */
import { forwardRef } from "react";
import { Upload as AntUpload } from "antd";
/** 封面图最大体积：2MB（字节） */
export const COVER_MAX_SIZE = 2 * 1024 * 1024;
/** 章节文件最大体积：5MB（字节） */
export const CHAPTER_MAX_SIZE = 5 * 1024 * 1024;
/**
 * beforeUpload 校验工具：按 maxSize / type 校验文件，合法返回 true，非法返回 false。
 *
 * @example
 * beforeUpload={(file) => validateUpload(file, { maxSize: COVER_MAX_SIZE, type: 'image/' })}
 */
export function validateUpload(file, options) {
    const { maxSize, type } = options;
    if (typeof maxSize === "number" && file.size > maxSize) {
        return false;
    }
    if (type) {
        const allowed = Array.isArray(type) ? type : [type];
        const ok = allowed.some((t) => t.endsWith("/") ? file.type.startsWith(t) : file.type === t);
        if (!ok)
            return false;
    }
    return true;
}
/**
 * B 端上传。
 *
 * - 透传 AntD Upload props（listType: text / picture / picture-card）
 * - 透传 beforeUpload；若传入 maxSize / acceptType 且未自定义 beforeUpload，则自动接入 validateUpload
 *
 * 文档：封面图建议尺寸 120×160，listType='picture-card'，maxSize=COVER_MAX_SIZE(2MB)。
 */
export const BUpload = forwardRef(({ maxSize, acceptType, beforeUpload, ...rest }, ref) => {
    const wired = maxSize !== undefined ||
        acceptType !== undefined ||
        beforeUpload !== undefined;
    const handleBeforeUpload = (file, fileList) => {
        if (!validateUpload(file, { maxSize, type: acceptType })) {
            return AntUpload.LIST_IGNORE;
        }
        return beforeUpload ? beforeUpload(file, fileList) : true;
    };
    return (_jsx(AntUpload, { ref: ref, beforeUpload: wired ? handleBeforeUpload : undefined, ...rest }));
});
BUpload.displayName = "BUpload";
//# sourceMappingURL=BUpload.js.map