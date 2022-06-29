module.exports = {
  extends: '../.eslintrc.js',
  parserOptions: {
    project: 'tsconfig.json',
    parser: require.resolve('@typescript-eslint/parser'),
    extraFileExtensions: ['.vue'],
  },
  globals: {
    ga: true,
    cordova: true,
    __statics: true,
    process: true,
    Capacitor: true,
    chrome: true,
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': 1,
    '@typescript-eslint/no-non-null-assertion': 0,
  },
};
