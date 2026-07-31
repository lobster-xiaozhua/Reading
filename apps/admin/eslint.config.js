// @ts-check
// P0-6 复用边界铁律：禁止 B 端直接 import @novel/components 基础组件
// 仅允许显式子路径引用 useAsyncState Hook（见 tsconfig.json paths）
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // ========== P0-6 复用边界铁律（审查 #1） ==========
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@novel/components',
              message:
                'B 端禁用 C 端 Atlas 自研组件库的基础组件（Button/Input/Modal 等）。请改用 antd 导入；如需 useAsyncState Hook，请使用子路径 @novel/components/useAsyncState。详见 04-B端开发计划.md §0.3。',
            },
          ],
        },
      ],
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
