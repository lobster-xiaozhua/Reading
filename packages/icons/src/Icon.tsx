/* ============================================================
 * Atlas Design System · Icon Base
 * 所有图标的渲染契约：
 *   - 24×24 viewbox，1.8px 描边，round linecap/linejoin
 *   - 颜色通过 currentColor 继承父级文字色（禁止 SVG 内硬编码色值）
 *   - size 映射到 --icon-size-* 令牌；className 透传
 * Source: 02-通用设计.md §3.1
 * ============================================================ */

import { memo, type SVGProps } from 'react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** size → CSS var(--icon-size-*) 映射 */
const SIZE_VAR: Record<IconSize, string> = {
  xs: 'var(--icon-size-xs)',
  sm: 'var(--icon-size-sm)',
  md: 'var(--icon-size-md)',
  lg: 'var(--icon-size-lg)',
  xl: 'var(--icon-size-xl)',
  '2xl': 'var(--icon-size-2xl)',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  /** 尺寸档位，默认 md（16px）。映射到 --icon-size-* 令牌 */
  size?: IconSize;
  /** 可访问性标签；提供则设 aria-label，否则 svg 设 aria-hidden */
  'aria-label'?: string;
}

/**
 * 图标基础组件。所有具体图标通过 children 传入 <path>/<circle> 等，
 * 描边/填充由本组件统一控制。
 */
export const Icon = memo(function Icon({
  size = 'md',
  className,
  children,
  'aria-label': ariaLabel,
  ...rest
}: IconProps) {
  const dim = SIZE_VAR[size];
  const a11y = ariaLabel
    ? { role: 'img' as const, 'aria-label': ariaLabel }
    : { 'aria-hidden': true as const };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ width: dim, height: dim, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
      {...a11y}
      {...rest}
    >
      {children}
    </svg>
  );
});
