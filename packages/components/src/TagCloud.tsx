/* ============================================================
 * TagCloud · P6 §2
 * 标签云：cloud（pill，字号随 count 映射）/ list（行式）两变体
 * 热门 TOP3 加「热」暖橙标记；选中 brand 高亮
 * ============================================================ */

import { useMemo } from 'react';
import { NovelFire } from '@novel/icons';

export interface TagCloudTag {
  id: string;
  name: string;
  count: number;
}

export interface TagCloudProps {
  tags: TagCloudTag[];
  /** 排序：count 降序 / name 升序，默认 count */
  sortBy?: 'count' | 'name';
  /** 截断数量，默认 30 */
  maxCount?: number;
  /** 展示形态，默认 cloud */
  variant?: 'cloud' | 'list';
  /** 选中的标签 id 列表 */
  selected?: string[];
  onSelect?: (tag: TagCloudTag) => void;
  className?: string;
}

type SizeTier = 'sm' | 'md' | 'xl';

/** 按 count 占比分档字号（count 越大字越大） */
function sizeTier(ratio: number): SizeTier {
  if (ratio >= 0.66) return 'xl';
  if (ratio >= 0.33) return 'md';
  return 'sm';
}

export function TagCloud({
  tags,
  sortBy = 'count',
  maxCount = 30,
  variant = 'cloud',
  selected = [],
  onSelect,
  className,
}: TagCloudProps) {
  const { sorted, hotIds, maxC } = useMemo(() => {
    const arr = [...tags];
    if (sortBy === 'count') arr.sort((a, b) => b.count - a.count);
    else arr.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    const sliced = arr.slice(0, maxCount);
    const m = sliced.reduce((mx, t) => Math.max(mx, t.count), 1);
    const byCount = [...sliced].sort((a, b) => b.count - a.count);
    const hot = new Set(byCount.slice(0, 3).map((t) => t.id));
    return { sorted: sliced, hotIds: hot, maxC: m };
  }, [tags, sortBy, maxCount]);

  const rootCls = ['novel-tagcloud', `novel-tagcloud--${variant}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  if (sorted.length === 0) {
    return <div className={rootCls}>暂无标签</div>;
  }

  return (
    <div className={rootCls}>
      {variant === 'cloud' ? (
        <ul className="novel-tagcloud__cloud" role="list">
          {sorted.map((t) => {
            const ratio = t.count / maxC;
            const tier = sizeTier(ratio);
            const isHot = hotIds.has(t.id);
            const isSelected = selected.includes(t.id);
            const cls = [
              'novel-tagcloud__pill',
              `novel-tagcloud__pill--${tier}`,
              isHot ? 'is-hot' : '',
              isSelected ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={t.id} role="listitem">
                <button
                  type="button"
                  className={cls}
                  aria-pressed={isSelected}
                  onClick={onSelect ? () => onSelect(t) : undefined}
                  aria-label={`${t.name}，${t.count} 本`}
                >
                  {isHot ? <NovelFire size="xs" aria-hidden="true" className="novel-tagcloud__hot" /> : null}
                  <span className="novel-tagcloud__name">{t.name}</span>
                  <span className="novel-tagcloud__count">{t.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="novel-tagcloud__listview" role="list">
          {sorted.map((t) => {
            const isSelected = selected.includes(t.id);
            const cls = [
              'novel-tagcloud__item',
              isSelected ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <li key={t.id} role="listitem" className={cls}>
                <button
                  type="button"
                  className="novel-tagcloud__item-btn"
                  aria-pressed={isSelected}
                  onClick={onSelect ? () => onSelect(t) : undefined}
                  aria-label={`${t.name}，${t.count} 本`}
                >
                  <span className="novel-tagcloud__name">{t.name}</span>
                  <span className="novel-tagcloud__count">{t.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
