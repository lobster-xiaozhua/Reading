/* ============================================================
 * LazyImage · P7-4
 * 图片懒加载 + 骨架占位 + WebP/CDN 断点适配
 *   - IntersectionObserver 触发加载，加载前显示骨架占位
 *   - 加载失败回退到 fallback 节点
 *   - 支持 srcset/sizes 断点适配（CDN 同图不同分辨率）
 *   - WebP 优先：若浏览器支持且源提供 .webp，自动选用
 *   - 弱网时（useNetworkStatus）降级到最小尺寸 src，节省流量
 * ============================================================ */

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { generateCoverSvgDataUrl } from "../utils/generateDefaultCover";
import "./LazyImage.css";

export interface LazyImageProps {
  /** 默认图源（最低兼容，必填） */
  src: string;
  /** alt 文本（无障碍必需） */
  alt: string;
  /** 断点适配 srcset：[{ src, w }]，w 为该图实际宽度 */
  srcset?: Array<{ src: string; w: number }>;
  /** sizes 描述（默认 '100vw'） */
  sizes?: string;
  /** 容器 className */
  className?: string;
  /** 容器 style（用于固定宽高比占位，避免 CLS） */
  style?: CSSProperties;
  /** 加载失败时的回退内容（默认显示首字） */
  fallback?: React.ReactNode;
  /** 容器宽高比（如 '3 / 4'），用于骨架占位 */
  aspectRatio?: string;
  /** 是否禁用懒加载（首屏 LCP 图建议禁用，立即加载） */
  eager?: boolean;
  /** 弱网时是否降级到最小尺寸 src（默认 true） */
  degradeOnSlow?: boolean;
}

function supportsWebP(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  if (canvas.toDataURL) {
    return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  }
  return false;
}

let webpSupported: boolean | null = null;

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  srcset,
  sizes = "100vw",
  className,
  style,
  fallback,
  aspectRatio,
  eager = false,
  degradeOnSlow = true,
}: LazyImageProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const net = useNetworkStatus();

  /* ---------- WebP 支持探测（单次） ---------- */
  if (webpSupported === null && typeof document !== "undefined") {
    webpSupported = supportsWebP();
  }

  /* ---------- IntersectionObserver 懒加载 ---------- */
  useEffect(() => {
    if (eager || visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      // rootMargin 对齐 --space-12（48px），提前触发懒加载
      { rootMargin: "48px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, visible]);

  /* ---------- 弱网降级：使用最小尺寸 src ---------- */
  const useMinSrc = degradeOnSlow && net.shouldDegrade;
  const finalSrcset = useMinSrc ? undefined : srcset;

  /* 空 src 自动生成默认封面 */
  const defaultCover = useMemo(
    () => (!src && alt ? generateCoverSvgDataUrl(alt) : null),
    [src, alt],
  );
  const effectiveSrc = src || defaultCover || "";

  /* ---------- 组装 srcset 字符串 ---------- */
  const srcsetStr = finalSrcset?.map((s) => `${s.src} ${s.w}w`).join(", ");

  /* ---------- WebP 优先：仅对远程图片生效，本地生成的 SVG 跳过 ---------- */
  let resolvedSrc = effectiveSrc;
  let resolvedSrcset = srcsetStr;
  if (webpSupported && !useMinSrc && resolvedSrc && !resolvedSrc.startsWith("data:")) {
    if (resolvedSrc && /\.(jpe?g|png)$/i.test(resolvedSrc)) {
      resolvedSrc = resolvedSrc.replace(/\.(jpe?g|png)$/i, ".webp");
    }
    if (resolvedSrcset) {
      resolvedSrcset = resolvedSrcset.replace(
        /\.(jpe?g|png)(\s\d+w)/gi,
        ".webp$2",
      );
    }
  }

  const containerStyle: CSSProperties = {
    ...style,
    ...(aspectRatio ? { aspectRatio } : null),
  };

  return (
    <div
      ref={ref}
      className={`lazy-image ${loaded ? "is-loaded" : ""} ${errored ? "is-errored" : ""} ${className ?? ""}`}
      style={containerStyle}
    >
      {!loaded && !errored && (
        <div className="lazy-image__skeleton" aria-hidden />
      )}
      {errored ? (
        <div className="lazy-image__fallback" aria-hidden>
          {fallback ?? (
            <span className="lazy-image__fallback-text">{alt.slice(0, 1)}</span>
          )}
        </div>
      ) : visible ? (
        <img
          className="lazy-image__img"
          src={resolvedSrc}
          srcSet={resolvedSrcset}
          sizes={resolvedSrcset ? sizes : undefined}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : null}
    </div>
  );
});
