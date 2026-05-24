import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['server/**/*.{ts,tsx}'],
    rules: {}
  }
];
