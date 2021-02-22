module.exports = {
  overrides: [
    {
      files: '**/*.sol',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: ['**/*.js', '**/*.ts', '**/*.vue'],
      options: {
        bracketSpacing: true,
        trailingComma: 'es5',
        tabWidth: 2,
        printWidth: 120,
        singleQuote: true,
        semi: true,
      },
    },
  ],
};
