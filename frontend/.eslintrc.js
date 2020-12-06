module.exports = {
  extends: '../.eslintrc',
  parserOptions: {
    project: 'tsconfig.json',
    parser: '@typescript-eslint/parser',
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
};
