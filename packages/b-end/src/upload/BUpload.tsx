/* ============================================================
 * P2-9 · BUpload · B 端上传封装
 * 基于 Ant Design Upload，透传 props 并提供 beforeUpload 校验工具。
 * Source: 04-B端开发计划.md P2-9
 * ============================================================ */

import { forwardRef, type ComponentRef } from 'react';
import { Upload as AntUpload } from 'antd';
import type { UploadProps } from 'antd';
import type { RcFile } from 'antd/lib/upload';

/** 封面图最大体积：2MB（字节） */
export const COVER_MAX_SIZE = 2 * 1024 * 1024;
/** 章节文件最大体积：5MB（字节） */
export const CHAPTER_MAX_SIZE = 5 * 1024 * 1024;

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
export function validateUpload(file: File, options: UploadValidationOptions): boolean {
  const { maxSize, type } = options;
  if (typeof maxSize === 'number' && file.size > maxSize) {
    return false;
  }
  if (type) {
    const allowed = Array.isArray(type) ? type : [type];
    const ok = allowed.some((t) => (t.endsWith('/') ? file.type.startsWith(t) : file.type === t));
    if (!ok) return false;
  }
  return true;
}

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
export const BUpload = forwardRef<ComponentRef<typeof AntUpload>, BUploadProps>(
  ({ maxSize, acceptType, beforeUpload, ...rest }, ref) => {
    const wired = maxSize !== undefined || acceptType !== undefined || beforeUpload !== undefined;
    const handleBeforeUpload = (file: RcFile, fileList: RcFile[]) => {
      if (!validateUpload(file, { maxSize, type: acceptType })) {
        return AntUpload.LIST_IGNORE;
      }
      return beforeUpload ? beforeUpload(file, fileList) : true;
    };
    return <AntUpload ref={ref} beforeUpload={wired ? handleBeforeUpload : undefined} {...rest} />;
  },
);

BUpload.displayName = 'BUpload';
