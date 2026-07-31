/* ============================================================
 * P0-5 · AntD Theme Token 全量映射表
 * 将 Ant Design 5.x 的 ConfigProvider.theme.token 映射到 Atlas Design Tokens
 *
 * 映射策略（双层）：
 * 1. 主色 / 功能色：传递 JS 色值常量（AntD 内部基于此生成调色板 generateColor）
 * 2. 文本/背景/边框/字体/间距/阴影/动效：传递 CSS var 字符串
 *    （AntD 5.x 支持 var() 透传，运行时跟随 [data-theme] 切换）
 *
 * Source: 04-B端专项设计.md §3/§4/§12.1 + 01-前端底层设计.md
 * ============================================================ */

import { tokens } from '@novel/tokens';

const { color, font, shadow, motion, zIndex } = tokens;

/**
 * AntD 主题 token 映射
 * 完整覆盖 40+ 项，分 8 类，对应 04-B端开发计划.md P0-5 映射清单
 */
export const antdTokenMap = {
  /* ---------- 1. 品牌色（JS 值，参与调色板生成） ---------- */
  colorPrimary: color.brand.brand7,
  colorPrimaryHover: color.brand.brand6,
  colorPrimaryActive: color.brand.brand8,

  /* ---------- 2. 功能色（JS 值，参与调色板生成） ---------- */
  colorSuccess: color.success.success3,
  colorWarning: color.warning.warning3,
  colorError: color.error.error3,
  colorInfo: color.info.info3,

  /* ---------- 3. 文本（CSS var，跟随主题切换） ---------- */
  colorText: color.semantic.textPrimary,
  colorTextSecondary: color.semantic.textSecondary,
  colorTextTertiary: color.gray.gray6,
  colorTextQuaternary: color.gray.gray5,
  colorTextDisabled: color.semantic.textDisabled,
  colorTextHeading: color.semantic.textPrimary,

  /* ---------- 4. 背景（CSS var） ---------- */
  colorBgLayout: color.semantic.bgPage,
  colorBgContainer: color.semantic.bgSurface,
  colorBgElevated: color.semantic.bgElevated,
  colorBgSpotlight: color.semantic.textPrimary,
  colorBgBlur: 'transparent',

  /* ---------- 5. 边框 / 填充（CSS var） ---------- */
  colorBorder: color.semantic.borderDefault,
  colorBorderSecondary: color.semantic.borderSubtle,
  colorFill: color.gray.gray5,
  colorFillSecondary: color.gray.gray4,
  colorFillTertiary: color.gray.gray3,
  colorFillQuaternary: color.gray.gray2,

  /* ---------- 6. 交互态背景（CSS var） ---------- */
  controlItemBgHover: color.semantic.bgSubtle,
  controlItemBgActive: color.semantic.brandBg,
  controlItemBgActiveHover: color.brand.brand2,

  /* ---------- 7. 字体（CSS var + 固定数值） ---------- */
  fontFamily: font.sans,
  fontFamilyCode: font.mono,
  fontSize: 14,
  fontSizeLG: 16,
  fontSizeSM: 12,
  fontSizeXL: 20,
  fontSizeHeading1: 38,
  fontSizeHeading2: 30,
  fontSizeHeading3: 24,
  fontSizeHeading4: 20,
  fontSizeHeading5: 16,
  fontSizeIcon: 16,

  /* ---------- 8. 行高 ---------- */
  lineHeight: 1.5714,
  lineHeightLG: 1.5,
  lineHeightSM: 1.6667,
  lineHeightHeading1: 1.3,
  lineHeightHeading2: 1.35,
  lineHeightHeading3: 1.4,
  lineHeightHeading4: 1.5,
  lineHeightHeading5: 1.5714,

  fontWeightStrong: 600,

  /* ---------- 9. 圆角（数字，AntD 要求 number；与 --radius-* 对齐） ---------- */
  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 4,
  borderRadiusXS: 2,

  /* ---------- 10. 间距（数字，AntD 要求 number） ---------- */
  // 与 --space-* 对齐：4/8/12/16/20/24/32
  paddingXXS: 4,
  paddingXS: 8,
  paddingSM: 12,
  padding: 16,
  paddingMD: 20,
  paddingLG: 24,
  paddingXL: 32,
  marginXXS: 4,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  marginMD: 20,
  marginLG: 24,
  marginXL: 32,

  /* ---------- 11. 控件高度（B 端紧凑型，04 §6.1） ---------- */
  controlHeight: 32,
  controlHeightLG: 40,
  controlHeightSM: 24,

  /* ---------- 12. 阴影（CSS var） ---------- */
  boxShadow: shadow.sh3,
  boxShadowSecondary: shadow.sh2,
  boxShadowTertiary: shadow.sh1,

  /* ---------- 13. 层级（CSS var） ---------- */
  zIndexBase: Number(zIndex.base),
  zIndexPopupBase: Number(zIndex.dropdown),

  /* ---------- 14. 动效（CSS var） ---------- */
  motionDurationFast: motion.duration.fast,
  motionDurationMid: motion.duration.normal,
  motionDurationSlow: motion.duration.slow,
  motionEaseInOut: motion.ease.standard,
  motionEaseOut: motion.ease.decelerate,
  motionEaseIn: motion.ease.accelerate,

  /* ---------- 15. 线条 ---------- */
  lineWidth: 1,
  lineWidthBold: 2,
  wireframe: false,
} as const;

/**
 * 暗色模式下的覆盖 token
 * 用于在 resolvedUITheme === 'dark' 时合并到 theme.token
 * 主色在暗色下提亮（brand-7 → brand-6），保证对比度
 */
export const antdDarkTokenOverride = {
  colorPrimary: color.brand.brand6,
  colorPrimaryHover: color.brand.brand5,
  colorPrimaryActive: color.brand.brand7,
  colorSuccess: color.success.success2,
  colorWarning: color.warning.warning2,
  colorError: color.error.error2,
  colorInfo: color.info.info2,

  // 文本/背景/边框已通过 [data-theme='dark'] CSS var 自动切换，无需在此重复
  // 但 AntD 部分组件（如 Card 描边）读取 JS 值，需显式覆盖
  colorBgSpotlight: color.gray.gray1,
} as const;

export type AntdTokenMap = typeof antdTokenMap;
export type AntdDarkTokenOverride = typeof antdDarkTokenOverride;
