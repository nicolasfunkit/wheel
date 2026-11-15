import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'

export default [
  { ignores: ['dist/', 'dev-dist/'] },
  js.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ['src/**'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['test/**', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      // `_name` marks a deliberately unused binding (e.g. an #each item used only for its index).
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
]
