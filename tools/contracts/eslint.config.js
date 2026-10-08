// Flat config. The package is ESM JavaScript, so the sensor's default eslint
// wrapper has something real to run instead of finding no configuration.
export default [
  {
    files: ['src/**/*.mjs', 'test/**/*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { process: 'readonly', Buffer: 'readonly', console: 'readonly', URL: 'readonly', fetch: 'readonly' }
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },
  { ignores: ['node_modules/**', 'sbom.json'] }
];
