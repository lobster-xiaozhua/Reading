import { Link } from "react-router-dom";
import { NavigationChevronRight } from "@novel/icons";
import "./SectionTitle.css";

interface SectionTitleProps {
  title: string;
  /** 副标题/英文标题 */
  subtitle?: string;
  /** 右侧「更多」链接 */
  moreTo?: string;
  moreText?: string;
}

/**
 * 区块标题（带「更多」链接）
 */
export function SectionTitle({
  title,
  subtitle,
  moreTo,
  moreText = "更多",
}: SectionTitleProps) {
  return (
    <div className="novel-section-title">
      <div className="novel-section-title__head">
        <h2 className="novel-section-title__text">{title}</h2>
        {subtitle ? (
          <span className="novel-section-title__sub">{subtitle}</span>
        ) : null}
      </div>
      {moreTo ? (
        <Link to={moreTo} className="novel-section-title__more">
          {moreText}
          <NavigationChevronRight size="xs" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
