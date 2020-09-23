module.exports = {
  // https://eslint.org/docs/user-guide/configuring#configuration-cascading-and-hierarchy
  // This option interrupts the configuration hierarchy at this file
  // Remove this if you have an higher level ESLint config file (it usually happens into a monorepos)
  root: true,

  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },

  env: {
    browser: true,
  },

  // Rules order is important, please avoid shuffling them
  extends: [
    // https://github.com/prettier/eslint-config-prettier#installation
    // usage with Prettier, provided by 'eslint-config-prettier'.
    'prettier',
  ],

  plugins: [],

  globals: {
    ga: true, // Google Analytics
    cordova: true,
    __statics: true,
    process: true,
    Capacitor: true,
    chrome: true,
  },

  // add your custom rules here
  rules: {
    // Max line length of 100 characters, except for lines with comments or strings
    'max-len': [
      'error',
      {
        code: 100,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreStrings: true,
      },
    ],
  },
};
