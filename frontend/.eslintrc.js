module.exports = {
  extends: '../.eslintrc.js',
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
  rules: {
    '@typescript-eslint/ban-ts-comment': 1,
    '@typescript-eslint/no-non-null-assertion': 0,
    // vue/no-v-model-argument is disabled to support QTable's use of v-model:pagination.
    // See https://quasar.dev/start/upgrade-guide#qtable
    'vue/no-v-model-argument': 'off',
  },
};
