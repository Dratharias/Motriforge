/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
      alias: {
        map: [
          ['@', './src'],
          ['@components', './src/components'],
          ['@lib', './src/lib'],
          ['@modules', './src/modules'],
          ['@hooks', './src/hooks'],
          ['@context', './src/context'],
          ['@types', './src/types'],
          ['@styles', './src/styles'],
          ['@pages', './src/pages'],
          ['@ui', './src/components/ui'],
          ['@mobile', './src/components/mobile'],
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
    },
  },
  rules: {
    // TypeScript
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],

    // Imports
    'import/order': ['error', {
      groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
      'newlines-between': 'always',
    }],
  },
  env: {
    browser: true,
    es6: true,
    node: true,
  },
};
