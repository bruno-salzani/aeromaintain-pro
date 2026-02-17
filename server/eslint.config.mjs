import js from '@eslint/js';
import nPlugin from 'eslint-plugin-n';
import promisePlugin from 'eslint-plugin-promise';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      n: nPlugin,
      promise: promisePlugin
    },
    rules: {
      'no-unused-vars': 'off',
      'no-empty': 'warn'
    }
  }
];
