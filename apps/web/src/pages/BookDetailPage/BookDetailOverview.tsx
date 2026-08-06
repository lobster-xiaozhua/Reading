import { Skeleton } from "@novel/components";
import { RatingDistribution } from "@/components/RatingDistribution";
import type { RatingDistribution as RatingDist } from "@/api/types";

interface BookDetailOverviewProps {
  intro: string;
  rating: RatingDist | null;
}

export function BookDetailOverview({ intro, rating }: BookDetailOverviewProps) {
  return (
    <>
      <section className="book-detail__intro container-page">
        <h2 className="book-detail__section-title">内容简介</h2>
        <p className="book-detail__intro-text">{intro}</p>
      </section>

      <section className="book-detail__rating container-page">
        <h2 className="book-detail__section-title">评分分布</h2>
        {rating ? <RatingDistribution data={rating} /> : <Skeleton rows={3} />}
      </section>
    </>
  );
}
