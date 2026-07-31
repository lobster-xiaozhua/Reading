/* ============================================================
 * Atlas Design System · Tailwind 配置映射
 * 用法：import tailwindConfig from '@novel/tokens/tailwind'
 *       export default tailwindConfig
 * Source: 01-前端底层设计.md §13.4
 * ============================================================ */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: ['selector', "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // 语义色 → 引用 CSS 变量，自动跟随主题
        brand: 'var(--color-brand)',
        'brand-hover': 'var(--color-brand-hover)',
        'brand-active': 'var(--color-brand-active)',
        'brand-bg': 'var(--color-brand-bg)',
        'brand-border': 'var(--color-brand-border)',
        accent: 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-active': 'var(--color-accent-active)',
        'accent-orange': 'var(--color-accent-orange)',
        'accent-orange-hover': 'var(--color-accent-orange-hover)',
        'accent-orange-active': 'var(--color-accent-orange-active)',
        'accent-orange-bg': 'var(--color-accent-orange-bg)',
        rose: 'var(--color-rose)',
        'rose-light': 'var(--color-rose-light)',
        'rose-bg': 'var(--color-rose-bg)',
        bg: {
          page: 'var(--color-bg-page)',
          surface: 'var(--color-bg-surface)',
          subtle: 'var(--color-bg-subtle)',
          elevated: 'var(--color-bg-elevated)',
          mask: 'var(--color-bg-mask)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
          inverse: 'var(--color-text-inverse)',
          link: 'var(--color-text-link)',
          'link-hover': 'var(--color-text-link-hover)',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
          default: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
          focus: 'var(--color-border-focus)',
          strong: 'var(--color-border-strong)',
        },
        success: 'var(--color-feedback-success)',
        'success-bg': 'var(--color-feedback-success-bg)',
        warning: 'var(--color-feedback-warning)',
        'warning-bg': 'var(--color-feedback-warning-bg)',
        error: 'var(--color-feedback-error)',
        'error-bg': 'var(--color-feedback-error-bg)',
        info: 'var(--color-feedback-info)',
        'info-bg': 'var(--color-feedback-info-bg)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        serif: 'var(--font-serif)',
        mono: 'var(--font-mono)',
        novel: 'var(--novel-font-family)',
      },
      fontSize: {
        display: '64px',
        h1: '40px',
        h2: '28px',
        h3: '20px',
        body: '16px',
        caption: '13px',
        overline: '11px',
        novel: 'var(--novel-font-size)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
        32: 'var(--space-32)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        1: 'var(--sh-1)',
        2: 'var(--sh-2)',
        3: 'var(--sh-3)',
        4: 'var(--sh-4)',
        5: 'var(--sh-5)',
      },
      transitionDuration: {
        instant: 'var(--dur-instant)',
        fast: 'var(--dur-fast)',
        normal: 'var(--dur-normal)',
        slow: 'var(--dur-slow)',
        deliberate: 'var(--dur-deliberate)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        emphasized: 'var(--ease-emphasized)',
        decelerate: 'var(--ease-decelerate)',
        accelerate: 'var(--ease-accelerate)',
      },
      zIndex: {
        base: 'var(--z-index-base)',
        dropdown: 'var(--z-index-dropdown)',
        sticky: 'var(--z-index-sticky)',
        drawer: 'var(--z-index-drawer)',
        modal: 'var(--z-index-modal)',
        toast: 'var(--z-index-toast)',
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
};

export default config;
