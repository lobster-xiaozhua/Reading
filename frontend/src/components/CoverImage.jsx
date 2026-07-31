import { useState } from "react";

/**
 * 智能封面组件：加载中显示 shimmer 骨架，失败显示文字占位，成功淡入显示
 */
export default function CoverImage({ src, alt, fallbackText, className = "" }) {
  const [status, setStatus] = useState("loading");

  return (
    <div className="cover-wrapper" style={{ position: "relative", width: "100%", height: "100%" }}>
      {status === "loading" && (
        <div
          className="skeleton"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
          }}
        />
      )}
      {status === "error" && (
        <span className="cover-placeholder-modern">{fallbackText || "?"}</span>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={className}
        style={{
          opacity: status === "loaded" ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}