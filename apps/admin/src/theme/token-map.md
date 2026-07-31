# AntD Theme Token 全量映射对照表

> **版本**：V1.1.0 · 2026.07
> **对应代码**：[apps/admin/src/theme/token-map.ts](file:///apps/admin/src/theme/token-map.ts)
> **依据**：04-B端专项设计.md §3/§4/§12.1 + 01-前端底层设计.md

## 映射策略

AntD 5.x 的 `ConfigProvider.theme.token` 接收 JS 值（非 CSS var 字符串），因为 AntD 内部基于主色生成调色板（`generateColor`）。为实现主题切换跟随 `[data-theme]`，采用双层策略：

| 类别 | 传递形式 | 理由 |
| --- | --- | --- |
| 主色 / 功能色 | JS 色值常量 | AntD 需基于此生成 hover/active/bg/border 调色板 |
| 文本/背景/边框 | CSS var 字符串 | AntD 5.x 支持 `var()` 透传，运行时跟随 `[data-theme]` 切换 |
| 字体/间距/圆角/阴影/动效 | CSS var 字符串或固定数值 | 与设计令牌对齐，CSS var 类跟随主题切换 |

暗色模式：主色等 JS 值通过 `antdDarkTokenOverride` 在 `resolvedUITheme === 'dark'` 时合并覆盖；文本/背景/边框通过 `:root[data-theme='dark']` CSS var 自动切换。

## 全量映射清单（40+ 项）

### 1. 品牌色（JS 值）

| AntD Token | 值 | 来源 |
| --- | --- | --- |
| colorPrimary | #1890FF (brand-7) | 04 §3.2 |
| colorPrimaryHover | #40A9FF (brand-6) | 04 §3.2 |
| colorPrimaryActive | #096DD9 (brand-8) | 04 §3.2 |

### 2. 功能色（JS 值）

| AntD Token | 值 | 来源 |
| --- | --- | --- |
| colorSuccess | #52C41A (success-3) | 04 §3.3 |
| colorWarning | #FAAD14 (warning-3) | 04 §3.3 |
| colorError | #F5222D (error-3) | 04 §3.3 |
| colorInfo | #1890FF (info-3) | 04 §3.5 |

### 3. 文本（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| colorText | var(--color-text-primary) | 04 §3.4 |
| colorTextSecondary | var(--color-text-secondary) | 04 §3.4 |
| colorTextTertiary | var(--gray-6) | 04 §3.4 |
| colorTextQuaternary | var(--gray-5) | 04 §3.4 |
| colorTextDisabled | var(--color-text-disabled) | 04 §3.4 |
| colorTextHeading | var(--color-text-primary) | 04 §3.4 |

### 4. 背景（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| colorBgLayout | var(--color-bg-page) | 04 §3.4 |
| colorBgContainer | var(--color-bg-surface) | 04 §3.4 |
| colorBgElevated | var(--color-bg-elevated) | 04 §3.4 |
| colorBgSpotlight | var(--color-text-primary) | AntD 默认 |
| colorBgBlur | transparent | AntD 默认 |

### 5. 边框 / 填充（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| colorBorder | var(--color-border-default) | 04 §3.4 |
| colorBorderSecondary | var(--color-border-subtle) | 04 §3.4 |
| colorFill | var(--gray-5) | 01 §5 |
| colorFillSecondary | var(--gray-4) | 01 §5 |
| colorFillTertiary | var(--gray-3) | 01 §5 |
| colorFillQuaternary | var(--gray-2) | 01 §5 |

### 6. 交互态背景（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| controlItemBgHover | var(--color-bg-subtle) | 04 §3.4 |
| controlItemBgActive | var(--color-brand-bg) | 04 §3.4 |
| controlItemBgActiveHover | var(--brand-2) | 04 §3.4 |

### 7. 字体

| AntD Token | 值 | 来源 |
| --- | --- | --- |
| fontFamily | var(--font-sans) | 04 §4.1 |
| fontFamilyCode | var(--font-mono) | 04 §4.1 |
| fontSize | 14 | 04 §4.2 |
| fontSizeLG | 16 | 04 §4.2 |
| fontSizeSM | 12 | 04 §4.2 |
| fontSizeXL | 20 | 04 §4.2 |
| fontSizeHeading1 | 38 | 04 §4.2 |
| fontSizeHeading2 | 30 | 04 §4.2 |
| fontSizeHeading3 | 24 | 04 §4.2 |
| fontSizeHeading4 | 20 | 04 §4.2 |
| fontSizeHeading5 | 16 | 04 §4.2 |
| fontSizeIcon | 16 | AntD 默认 |

### 8. 行高

| AntD Token | 值 | 来源 |
| --- | --- | --- |
| lineHeight | 1.5714 | 04 §4.4 |
| lineHeightLG | 1.5 | 04 §4.4 |
| lineHeightSM | 1.6667 | 04 §4.4 |
| lineHeightHeading1~5 | 1.3 / 1.35 / 1.4 / 1.5 / 1.5714 | 04 §4.4 |
| fontWeightStrong | 600 | 04 §4.3 |

### 9. 圆角（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| borderRadius | var(--radius-md) = 8px | 04 §12.1 |
| borderRadiusLG | var(--radius-lg) = 12px | 04 §12.1 |
| borderRadiusSM | var(--radius-sm) = 4px | 04 §12.1 |
| borderRadiusXS | var(--radius-xs) = 2px | 04 §12.1 |

### 10. 间距（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| paddingXXS | var(--space-1) = 4px | 01 §6 |
| paddingXS | var(--space-2) = 8px | 01 §6 |
| paddingSM | var(--space-3) = 12px | 01 §6 |
| padding | var(--space-4) = 16px | 01 §6 |
| paddingMD | var(--space-5) = 20px | 01 §6 |
| paddingLG | var(--space-6) = 24px | 01 §6 |
| paddingXL | var(--space-8) = 32px | 01 §6 |
| marginXXS~XL | 同 padding 对应 | 01 §6 |

### 11. 控件高度（B 端紧凑型）

| AntD Token | 值 | 来源 |
| --- | --- | --- |
| controlHeight | 32 | 02 §1 |
| controlHeightLG | 40 | 02 §1 |
| controlHeightSM | 24 | 02 §1 |

### 12. 阴影（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| boxShadow | var(--sh-3) | 04 §12.1 |
| boxShadowSecondary | var(--sh-2) | 04 §12.1 |
| boxShadowTertiary | var(--sh-1) | 04 §12.1 |

### 13. 层级（CSS var）

| AntD Token | 值 | 来源 |
| --- | --- | --- |
| zIndexBase | 0 | 01 §11 |
| zIndexPopupBase | 1000 | 01 §11 |

### 14. 动效（CSS var）

| AntD Token | 映射 | 来源 |
| --- | --- | --- |
| motionDurationFast | var(--dur-fast) = 150ms | 01 §10 |
| motionDurationMid | var(--dur-normal) = 240ms | 01 §10 |
| motionDurationSlow | var(--dur-slow) = 360ms | 01 §10 |
| motionEaseInOut | var(--ease-standard) | 01 §10 |
| motionEaseOut | var(--ease-decelerate) | 01 §10 |
| motionEaseIn | var(--ease-accelerate) | 01 §10 |

### 15. 线条

| AntD Token | 值 |
| --- | --- |
| lineWidth | 1 |
| lineWidthBold | 2 |
| wireframe | false |

## 暗色覆盖（antdDarkTokenOverride）

当 `resolvedUITheme === 'dark'` 时，以下 token 显式覆盖（其余通过 CSS var 自动切换）：

| AntD Token | Light | Dark | 理由 |
| --- | --- | --- | --- |
| colorPrimary | brand-7 (#1890FF) | brand-6 (#40A9FF) | 暗色提亮保证对比度 |
| colorPrimaryHover | brand-6 | brand-5 | 同上 |
| colorPrimaryActive | brand-8 | brand-7 | 同上 |
| colorSuccess | success-3 | success-2 | 同上 |
| colorWarning | warning-3 | warning-2 | 同上 |
| colorError | error-3 | error-2 | 同上 |
| colorInfo | info-3 | info-2 | 同上 |
| colorBgSpotlight | text-primary | gray-1 | AntD 内部读取 JS 值 |

## 验收

- 渲染 `<Button type="primary">` `<Tag color="success">` `<Modal>` 三类典型组件，色值/字号/圆角/阴影与设计稿一致
- 切换 `[data-theme='dark']` 后所有 AntD 组件跟随切换
- Storybook 中 dark mode 工具栏切换生效
