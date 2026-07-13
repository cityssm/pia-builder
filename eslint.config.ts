import eslintCspell from '@cspell/eslint-plugin'
import configWebApp, { defineConfig } from 'eslint-config-cityssm'
import { cspellWords } from 'eslint-config-cityssm/exports'

export const config = defineConfig(configWebApp, {
  files: ['**/*.ts'],
  languageOptions: {
    parserOptions: {
      projectService: true
    }
  },
  plugins: {
    '@cspell': eslintCspell
  },
  rules: {
    '@cspell/spellchecker': [
      'warn',
      {
        cspell: {
          words: [...cspellWords, 'pias']
        }
      }
    ],
    '@typescript-eslint/no-unsafe-type-assertion': 'off'
  }
})
