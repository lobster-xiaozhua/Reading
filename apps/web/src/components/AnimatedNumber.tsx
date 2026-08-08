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
  const prevValueRef = useRef(0);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const diff = value - startValue;
    if (diff === 0) {
      setDisplay(value);
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

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = value;
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