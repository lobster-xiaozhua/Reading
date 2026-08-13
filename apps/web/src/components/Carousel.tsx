import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LazyImage } from "@/components/LazyImage";
import { NavigationChevronLeft, NavigationChevronRight } from "@novel/icons";
import type { Banner } from "@/api/types";
import "./Carousel.css";

interface CarouselProps {
  banners: Banner[];
  /** 自动轮播间隔，0 表示禁用 */
  interval?: number;
}

/** 屏幕阅读器：只读一次不需要 announce title 细节，仅播报当前张数 */
function carouselAriaLabel(count: number, active: number): string {
  if (count === 0) return "";
  return `当前是第 ${active + 1} 张，共 ${count} 张`;
}

/**
 * Banner 轮播（03 §5.1）
 * 5 张推荐，自动轮播 5s，可手动切换
 */
export function Carousel({ banners, interval = 5000 }: CarouselProps) {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % banners.length);
  }, [banners.length]);
  const prev = useCallback(() => {
    setActive((i) => (i - 1 + banners.length) % banners.length);
  }, [banners.length]);
  const handleDotClick = useCallback((i: number) => {
    setActive(i);
  }, []);

  useEffect(() => {
    if (!interval || banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) next();
    }, interval);
    // 后台返回前台时重置计时（避免切 Tab 回来瞬间跳一张）
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!pausedRef.current) next();
      }, interval);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [interval, banners.length, next]);

  if (banners.length === 0) {
    return (
      <div className="novel-carousel__placeholder" aria-label="Banner 加载中" />
    );
  }

  return (
    <div
      className="novel-carousel"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="推荐 Banner"
    >
      <div className="novel-carousel__viewport" style={{ transform: `translateX(-${active * 100}%)` }}>
        {banners.map((b, i) => (
          <Link
            key={b.id}
            to={`/book/${b.bookId}`}
            className={`novel-carousel__slide ${i === active ? "is-active" : ""}`}
            aria-hidden={i !== active}
      aria-label={`${b.title} - ${b.subtitle}`}
    >
            <LazyImage
              src={b.cover}
              alt={b.title}
              className="novel-carousel__slide-img"
              eager={i === 0}
              degradeOnSlow={false}
            />
            <div className="novel-carousel__overlay" />
            <div className="novel-carousel__caption">
              <h3 className="novel-carousel__title">{b.title}</h3>
              <p className="novel-carousel__subtitle">{b.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* 自动播放进度条 */}
      <div className="novel-carousel__progress" aria-hidden>
        {banners.map((_, i) => (
          <div
            key={i}
            className="novel-carousel__progress-fill"
            style={{
              width: i === active ? '100%' : '0%',
              transitionDuration: i === active ? `${interval}ms` : '0ms',
            }}
          />
        ))}
      </div>

      <button
        type="button"
        className="novel-carousel__arrow novel-carousel__arrow--prev"
        onClick={prev}
        aria-label="上一张"
      >
        <NavigationChevronLeft size="lg" />
      </button>
      <button
        type="button"
        className="novel-carousel__arrow novel-carousel__arrow--next"
        onClick={next}
        aria-label="下一张"
      >
        <NavigationChevronRight size="lg" />
      </button>

      <div
        className="novel-carousel__dots"
        role="tablist"
        aria-label="Banner 切换"
      >
        {banners.map((b, i) => (
          <button
            key={b.id}
            type="button"
            className={`novel-carousel__dot ${i === active ? "is-active" : ""}`}
            role="tab"
            aria-selected={i === active}
            aria-label={`第 ${i + 1} 张`}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>

      {/* 屏幕阅读器播报当前轮播位置 */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {carouselAriaLabel(banners.length, active)}
      </div>
    </div>
  );
}
