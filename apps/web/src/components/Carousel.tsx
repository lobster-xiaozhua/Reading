import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Banner } from "@/api/types";
import "./Carousel.css";

interface CarouselProps {
  banners: Banner[];
  /** 自动轮播间隔，0 表示禁用 */
  interval?: number;
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

  useEffect(() => {
    if (!interval || banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) next();
    }, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
      <div className="novel-carousel__viewport">
        {banners.map((b, i) => (
          <Link
            key={b.id}
            to={`/book/${b.bookId}`}
            className={`novel-carousel__slide ${i === active ? "is-active" : ""}`}
            aria-hidden={i !== active}
            aria-label={`${b.title} - ${b.subtitle}`}
            style={{
              transform: `translateX(-${active * 100}%)`,
              backgroundImage: `url(${b.cover})`,
            }}
          >
            <div className="novel-carousel__overlay" />
            <div className="novel-carousel__caption">
              <h3 className="novel-carousel__title">{b.title}</h3>
              <p className="novel-carousel__subtitle">{b.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>

      <button
        type="button"
        className="novel-carousel__arrow novel-carousel__arrow--prev"
        onClick={prev}
        aria-label="上一张"
      >
        ‹
      </button>
      <button
        type="button"
        className="novel-carousel__arrow novel-carousel__arrow--next"
        onClick={next}
        aria-label="下一张"
      >
        ›
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
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </div>
  );
}
