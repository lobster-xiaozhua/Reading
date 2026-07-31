import tokensTailwind from '@novel/tokens/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  ...tokensTailwind,
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/components/src/**/*.{ts,tsx}',
  ],
};
