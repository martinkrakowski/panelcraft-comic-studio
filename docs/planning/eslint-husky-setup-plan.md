# Implementation Plan - Husky & ESLint Setup

This document outlines the setup and configuration of ESLint v9 and Husky git hooks for the PanelCraft workspace.

## Objectives
1. Fix existing ESLint v9 resolution crashes (due to missing `typescript-eslint` package).
2. Remove deprecated/unsupported `--ext` options from package scripts.
3. Configure unified root-level and package-level ESLint rules.
4. Integrate Husky and `lint-staged` for pre-commit linting and formatting.

## Current State
- **Root `package.json`**: Already has `eslint@^9.0.0`, `prettier@^3.0.0`, `typescript@^5.5.4` installed.
- **Workspace structure**: `apps/web`, `apps/api`, `packages/shared`, `packages/ui`, `packages/types`, `packages/comic-generation`, `packages/comic-project-management`.
- **Lint scripts**: Currently use deprecated `eslint src --ext .ts,.tsx` pattern.
- **No existing conflicts**: No `.eslintrc.*` files in the project (clean slate for ESLint v9 flat config).

## Proposed Changes

### Phase 1: Root Configuration

#### 1. Root `package.json`
- Add `typescript-eslint`, `husky`, `lint-staged` to `devDependencies`.
- Add `"prepare": "husky"` script to initialize Husky (v9 format).

#### 2. Root `eslint.config.js`
Create shared ESLint configuration with recursive glob patterns for build ignores:
```javascript
import js from '@eslint/js';
import typescript from 'typescript-eslint';

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
    rules: {
      'prefer-const': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always']
    }
  }
];
```

#### 3. Root `.prettierrc.json`
Create shared Prettier configuration (sourced from `.vscode/settings.json`):
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

#### 4. Root `.editorconfig`
Ensures file-level consistency across editors:
```ini
root = true

[*]
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
charset = utf-8

[*.md]
trim_trailing_whitespace = false
```

#### 5. Root `.lintstagedrc.json`
Define sequential tasks for staged files to prevent formatting conflicts:
```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,css}": [
    "prettier --write"
  ]
}
```

#### 6. Create `.husky/pre-commit`
Hook that runs `lint-staged` on staged files.

### Phase 2: Package Configuration

For each workspace (`apps/web`, `apps/api`, `packages/shared`, `packages/ui`, `packages/types`, `packages/comic-generation`, `packages/comic-project-management`):

#### Update `package.json`
Change lint script to remove deprecated `--ext` and add auto-fixing:
```json
"lint": "eslint src --fix"
```
*(Use `eslint . --fix` for packages where code resides in the root or other directories like `packages/shared`, `packages/comic-generation`, and `packages/comic-project-management`)*

#### Create/Modify `eslint.config.js`
Each package extends the root config:
```javascript
import baseConfig from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'], // adjust source folder accordingly
    rules: {}
  }
];
```

### Phase 3: Husky Initialization

1. Run `npx husky` to set up `.husky/` directory and configure the Git hook folder.
2. Populate `.husky/pre-commit` with the command to run `yarn lint-staged`.

## Implementation Order

1. **Install dependencies** at root → `yarn add -D typescript-eslint husky lint-staged`
2. **Create root config files**:
   - `eslint.config.js`
   - `.prettierrc.json`
   - `.editorconfig`
   - `.lintstagedrc.json`
3. **Initialize Husky** → `npx husky` and configure `.husky/pre-commit` with `yarn lint-staged`
4. **Update workspace package.json files** → Change all lint scripts to remove `--ext` (7 workspaces)
5. **Create/update workspace eslint.config.js** → Each package extends root config (7 workspaces)
6. **Test the setup**:
   - Run `yarn lint` to verify all workspaces lint successfully
   - Run `yarn lint-staged --dry-run` to test staged file linting
   - Create a test commit to verify pre-commit hook triggers

## VSCode Integration
The setup is fully compatible with `.vscode/settings.json`:
- ESLint rules enforce the same formatting preferences as Prettier
- Prettier configuration exactly matches VSCode settings
- EditorConfig enforces trailing newlines and whitespace trimming
- All format-on-save flows work without conflicts

## Verification Steps

1. **After installing dependencies and creating configs**:
   - Run `yarn lint` to ensure no syntax errors in root config
   - Verify Prettier can parse `.prettierrc.json`

2. **After updating all workspaces**:
   - Run `yarn lint` at root to validate all 7 workspaces

3. **Test pre-commit hook**:
   - Make a test commit and verify the pre-commit hook triggers `lint-staged` automatically

4. **Dry run test**:
   - Run `yarn lint-staged --dry-run` to verify expected file matching
