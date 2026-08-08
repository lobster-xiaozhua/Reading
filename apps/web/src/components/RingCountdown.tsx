import { useEffect, useId, useState } from "react";
import "./Countdown.css";

interface RingCountdownProps {
  /** 限免开始时间戳（ms） */
  start: number;
  /** 限免截止时间戳（ms） */
  deadline: number;
  /** 环形尺寸 */
  size?: number;
}

function format(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}天${pad(hours)}h`;
  return `${pad(hours)}:${pad(mins)}`;
}

/**
 * 限免进度环倒计时
 * 环形弧线表示剩余限免时长占比，中心显示剩余时间。
 * 剩余 < 30% 时从橙色过渡到玫瑰色。
 */
export function RingCountdown({
  start,
  deadline,
  size = 56,
}: RingCountdownProps) {
  const gid = useId().replace(/:/g, "-");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stroke = 4;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = Math.max(1, deadline - start);
  const remaining = Math.max(0, deadline - now);
  const ratio = Math.min(1, remaining / total);
  const urgent = ratio < 0.3;

  return (
    <div
      className={`novel-ring-countdown ${urgent ? "is-urgent" : ""}`}
      role="timer"
      aria-label={`限免剩余 ${format(remaining)}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <linearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-orange)" />
            <stop offset="100%" stopColor="var(--color-accent-orange-hover)" />
          </linearGradient>
        </defs>
        {/* 底环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent-orange-bg)"
          strokeWidth={stroke}
        />
        {/* 进度弧 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${ratio * C} ${C}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="novel-ring-countdown__text">
        {format(remaining)}
        <small>限免</small>
      </span>
    </div>
  );
}