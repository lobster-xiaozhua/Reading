import { useEffect, useState } from 'react';
import './Countdown.css';

interface CountdownProps {
  /** 截止时间戳（ms） */
  deadline: number;
  /** 紧急阈值（ms），低于此值切换 rose 脉冲 */
  urgentThreshold?: number;
}

function format(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days}天 ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * 限免倒计时（03 §6.2 Countdown）
 * 紧急态 rose 脉冲
 */
export function Countdown({ deadline, urgentThreshold = 3600 * 1000 }: CountdownProps) {
  const [remaining, setRemaining] = useState(deadline - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(deadline - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const urgent = remaining < urgentThreshold && remaining > 0;

  return (
    <span
      className={`novel-countdown ${urgent ? 'is-urgent' : ''}`}
      role="timer"
      aria-label={`剩余 ${format(remaining)}`}
    >
      <span className="novel-countdown__icon" aria-hidden>⏰</span>
      <span className="novel-countdown__time">{format(remaining)}</span>
    </span>
  );
}
