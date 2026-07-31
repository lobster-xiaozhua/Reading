import { useEffect, useRef } from "react";

export default function TocDrawer({ open, onClose, chapters, currentChapterId, onSelect }) {
  const activeRef = useRef(null);

  useEffect(() => {
    if (open && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [open]);

  return (
    <>
      <div
        className={`toc-drawer-overlay ${open ? "open" : ""}`}
        onClick={onClose}
      />
      <div className={`toc-drawer ${open ? "open" : ""}`}>
        <div className="toc-drawer-head">
          <strong>目录</strong>
          <button type="button" className="btn btn-ghost" onClick={onClose}>关闭</button>
        </div>
        <ul className="toc-drawer-list">
          {chapters.map((c) => {
            const isActive = c.id === currentChapterId;
            return (
              <li key={c.id} className={`toc-drawer-item ${isActive ? "active" : ""}`}>
                <button
                  ref={isActive ? activeRef : null}
                  type="button"
                  onClick={() => onSelect(c.id)}
                >
                  <span className={`toc-drawer-dot ${isActive ? "filled" : ""}`} />
                  {c.title}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}