import { useState, useRef, useCallback, useEffect } from "react";

const SPEEDS = [
  { label: "极慢", value: 1 },
  { label: "慢速", value: 2 },
  { label: "适中", value: 3 },
  { label: "快速", value: 4 },
  { label: "极速", value: 5 },
];

export default function AutoScroll({ scrollRef, onClose }) {
  const [speed, setSpeed] = useState(2);
  const [active, setActive] = useState(false);
  const rafRef = useRef(null);

  const startScroll = useCallback(() => {
    setActive(true);
  }, []);

  const stopScroll = useCallback(() => {
    setActive(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active || !scrollRef.current) return;

    const el = scrollRef.current;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = now - lastTime;
      lastTime = now;
      // speed 1-5, base 0.5px per frame at 60fps → 30px/s, max 150px/s
      const pxPerMs = (0.03 + speed * 0.02);
      el.scrollTop += pxPerMs * dt;

      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        // 到底了，自动停止
        stopScroll();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, speed, scrollRef, stopScroll]);

  // 触摸/按键时停止
  useEffect(() => {
    if (!active) return;
    const el = scrollRef.current;
    if (!el) return;

    const stop = () => stopScroll();
    el.addEventListener("touchstart", stop, { once: true });
    window.addEventListener("keydown", stop, { once: true });
    return () => {
      el.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [active, scrollRef, stopScroll]);

  return (
    <div className="auto-scroll-bar">
      {!active ? (
        <button type="button" className="btn btn-ghost auto-scroll-btn" onClick={startScroll} title="自动滚屏">
          ▶ 自动滚屏
        </button>
      ) : (
        <div className="auto-scroll-controls">
          <span className="auto-scroll-indicator">⏳ 滚屏中</span>
          <div className="auto-scroll-speeds">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`auto-scroll-speed ${speed === s.value ? "active" : ""}`}
                onClick={() => setSpeed(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost auto-scroll-stop" onClick={stopScroll}>
            ⏹ 停止
          </button>
        </div>
      )}
    </div>
  );
}