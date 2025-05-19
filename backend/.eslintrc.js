module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
        alwaysTryTypes: true,
      },
      alias: {
        map: [
          ['@', './src'],
          ['@lib', './src/lib'],
          ['@modules', './src/modules'],
          ['@types', './src/types'],
          ['@api', './src/api'],
        ],
        extensions: ['.ts', '.js'],
      },
    },
  },
  rules: {
    'import/order': ['error', {
      groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
      'newlines-between': 'always',
    }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  env: {
    node: true,
    es6: true,
  },
};