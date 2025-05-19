module.exports = {
  root: true,
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'import/order': ['error', {
      groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
      'newlines-between': 'always',
    }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error']
  },
  settings: {
    'import/resolver': {
      typescript: {},
    },
  },
  env: {
    node: true,
    es2022: true
  },
  ignorePatterns: ['dist', 'node_modules', '.cache', 'build'],
};