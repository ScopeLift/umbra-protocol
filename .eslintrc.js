module.exports = {
  env: {
    es2021: true,
  },

  extends: ['eslint:recommended', 'plugin:vue/essential', 'prettier', 'prettier/vue'],

  plugins: ['vue'],

  rules: {
    'prefer-const': 'error',
    'prefer-promise-reject-errors': 'off',
    quotes: ['warn', 'single', { avoidEscape: true }],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
  overrides: [
    {
      files: ['*'],
      excludedFiles: ['*.js'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:vue/vue3-essential',
        'prettier',
        'prettier/@typescript-eslint',
        'prettier/vue',
      ],

      plugins: ['@typescript-eslint', 'vue'],

      rules: {
        'prefer-const': 'error',
        'prefer-promise-reject-errors': 'off',
        quotes: ['warn', 'single', { avoidEscape: true }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
        '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
        '@typescript-eslint/restrict-template-expressions': 'error',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      },
    },
  ],
};
