import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="useEffect"]',
          message: 'Raw useEffect is banned. Use semantic wrappers from lib/hooks/.'
        },
        {
          selector: 'MemberExpression[object.name="React"][property.name="useEffect"]',
          message: 'Raw React.useEffect is banned. Use semantic wrappers from lib/hooks/.'
        }
      ]
    }
  },
  {
    files: [
      'src/lib/hooks/useMountEffect.ts',
      'src/lib/hooks/useUnmountEffect.ts',
      'src/lib/hooks/useEffectOnce.ts',
      'src/lib/hooks/useObjectUrls.ts',
      'src/lib/hooks/usePolling.ts'
    ],
    rules: {
      'no-restricted-syntax': 'off'
    }
  }
];
