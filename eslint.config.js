import js from '@eslint/js';
import typescript from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.output/**',
      '**/.hexagen/**'
    ]
  },
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks
    }
  },
  {
    rules: {
      'prefer-const': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['error', { allow: ['warn', 'error'] }]
    }
  },
  {
    files: [
      '**/infrastructure/adapters/*-logger.adapter.ts',
      '**/infrastructure/adapters/*-logger.adapter.ts'
    ],
    rules: {
      'no-console': 'off'
    }
  }
];
