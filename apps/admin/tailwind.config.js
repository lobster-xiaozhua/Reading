import tokensTailwind from '@novel/tokens/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  ...tokensTailwind,
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/b-end/src/**/*.{ts,tsx}',
  ],
  // B 端禁用 C 端情感色（04 §3.1）
  theme: {
    extend: {
      ...tokensTailwind.theme?.extend,
      // 不扩展 accent-orange / rose 等 C 端情感色
    },
  },
};
