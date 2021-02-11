module.exports = {
  extends: '../.eslintrc',
  parserOptions: {
    project: 'tsconfig.json',
    parser: '@typescript-eslint/parser',
  },
  env: {
    mocha: true,
    node: true,
  },
  rules: {
    'no-console': 'off',
  },
};
