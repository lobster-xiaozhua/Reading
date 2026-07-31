import { useEffect, useState } from "react";

const SHORTCUTS = [
  { keys: "← →", desc: "翻章" },
  { keys: "[ ]", desc: "调整字号" },
  { keys: "T", desc: "切换主题" },
  { keys: "B", desc: "添加书签" },
  { keys: "M", desc: "切换模式" },
  { keys: "A", desc: "自动滚屏" },
  { keys: "F", desc: "沉浸模式" },
  { keys: "?", desc: "显示帮助" },
];

export default function ShortcutHelp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("reader:show-shortcuts", handler);
    return () => window.removeEventListener("reader:show-shortcuts", handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div className="shortcut-overlay" onClick={() => setVisible(false)} />
      <div className="shortcut-panel card">
        <div className="shortcut-head">
          <strong>⌨️ 快捷键</strong>
          <button type="button" className="btn btn-ghost" onClick={() => setVisible(false)}>关闭</button>
        </div>
        <div className="shortcut-grid">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="shortcut-row">
              <kbd className="shortcut-keys">{s.keys}</kbd>
              <span className="shortcut-desc">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}