/* ============================================================
 * Atlas Design System · Icons · 入口
 * ============================================================ */

export { Icon, type IconProps, type IconSize } from './Icon.js';
export {
  allIcons,
  iconsByKebab,
  type IconComponent,
} from './icons.js';

// 重新导出全部 85 个图标组件（命名导出，便于 tree-shaking）
export * from './icons.js';
