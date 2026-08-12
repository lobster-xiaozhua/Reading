import type { UploadProps } from "antd";
/** 封面图最大体积：2MB（字节） */
export declare const COVER_MAX_SIZE: number;
/** 章节文件最大体积：5MB（字节） */
export declare const CHAPTER_MAX_SIZE: number;
export interface UploadValidationOptions {
    /** 最大文件大小（字节） */
    maxSize?: number;
    /**
     * 允许的文件类型：
     * - mime 前缀（如 'image/' 匹配所有图片）
     * - mime 数组（如 ['image/png', 'image/jpeg'] 精确匹配）
     */
    type?: string | string[];
}
/**
 * beforeUpload 校验工具：按 maxSize / type 校验文件，合法返回 true，非法返回 false。
 *
 * @example
 * beforeUpload={(file) => validateUpload(file, { maxSize: COVER_MAX_SIZE, type: 'image/' })}
 */
export declare function validateUpload(file: File, options: UploadValidationOptions): boolean;
export type BUploadProps = UploadProps & {
    /** 最大文件大小（字节）；传入后自动接入 beforeUpload 校验。封面 2MB / 章节 5MB */
    maxSize?: number;
    /** 允许的文件类型（mime 前缀或数组），传入后自动接入 beforeUpload 校验 */
    acceptType?: string | string[];
};
/**
 * B 端上传。
 *
 * - 透传 AntD Upload props（listType: text / picture / picture-card）
 * - 透传 beforeUpload；若传入 maxSize / acceptType 且未自定义 beforeUpload，则自动接入 validateUpload
 *
 * 文档：封面图建议尺寸 120×160，listType='picture-card'，maxSize=COVER_MAX_SIZE(2MB)。
 */
export declare const BUpload: import("react").ForwardRefExoticComponent<UploadProps<any> & {
    /** 最大文件大小（字节）；传入后自动接入 beforeUpload 校验。封面 2MB / 章节 5MB */
    maxSize?: number;
    /** 允许的文件类型（mime 前缀或数组），传入后自动接入 beforeUpload 校验 */
    acceptType?: string | string[];
} & import("react").RefAttributes<any>>;
//# sourceMappingURL=BUpload.d.ts.map