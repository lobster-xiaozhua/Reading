// @ts-check
// 共享 ESLint flat 配置：纯 TS 包与 React 包复用，消除各包重复配置。
// packages/* 与 tools/* 的 eslint.config.js 从这里导入。
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const ignores = { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'build/**'] };

// 下划线前缀参数/变量为占位符（forwardRef 未使用 ref、回调未使用参数等惯例）
const noUnusedVars = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
};

export const tsConfig = tseslint.config(
  ignores,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: noUnusedVars },
);

export const reactConfig = tseslint.config(
  ignores,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: noUnusedVars,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
