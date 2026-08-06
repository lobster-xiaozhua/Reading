import type { RatingDistribution as RatingDistributionData } from "@/api/types";
import { RatingStars } from "@novel/components";
import "./RatingDistribution.css";

interface Props {
  data: RatingDistributionData;
}

/**
 * 评分分布柱状图（03 §5.2 评论区）
 */
export function RatingDistribution({ data }: Props) {
  return (
    <div className="novel-rating-dist">
      <div className="novel-rating-dist__summary">
        <div className="novel-rating-dist__score">
          {data.average.toFixed(1)}
        </div>
        <RatingStars value={data.average} size="md" />
        <div className="novel-rating-dist__count">
          {data.total.toLocaleString()} 人评分
        </div>
      </div>
      <div className="novel-rating-dist__bars">
        {data.buckets.map((b) => (
          <div key={b.star} className="novel-rating-dist__row">
            <span className="novel-rating-dist__star">{b.star}星</span>
            <div className="novel-rating-dist__track">
              <div
                className="novel-rating-dist__fill"
                style={{ width: `${b.percent}%` }}
                role="progressbar"
                aria-valuenow={b.percent}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="novel-rating-dist__percent">{b.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
