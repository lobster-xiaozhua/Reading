import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * 数字渐变计数器：从 0 到目标值平滑递增。
 * 每次 value 变化时重新触发动画。
 */
export function AnimatedNumber({
  value,
  duration = 600,
  suffix = "",
  prefix = "",
  className = "",
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(0);
  const startTimeRef = useRef(0);
  const displayRef = useRef(0);

  useEffect(() => {
    // 动画中途 value 再次变化时，从当前显示值续跑而非回退到 0
    const startValue = displayRef.current;
    const diff = value - startValue;
    if (diff === 0) {
      setDisplay(value);
      displayRef.current = value;
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * eased);
      setDisplay(current);
      displayRef.current = current;

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return (
    <span className={`num-tabular ${className}`}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}