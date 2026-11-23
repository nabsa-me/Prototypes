import js from '@eslint/js';
import json from '@eslint/json';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-plugin-prettier';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

const codeFiles = ['**/*.{js,mjs,cjs,ts,mts,cts,svelte}'];
const svelteFiles = ['**/*.svelte', '**/*.svelte.{js,ts}'];
const jsoncFiles = ['**/tsconfig*.json', '**/.vscode/*.json', '**/*.jsonc'];

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  URL: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  fetch: 'readonly',
};

export default defineConfig(
  {
    ignores: ['**/coverage/**', '**/dist/**', '**/package-lock.json'],
  },
  {
    files: codeFiles,
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: nodeGlobals },
  },
  {
    files: svelteFiles,
    extends: [svelte.configs.recommended],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
    // svelte-check already type-checks the components, globals included.
    rules: { 'no-undef': 'off' },
  },
  {
    files: ['**/*.json'],
    ignores: jsoncFiles,
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  {
    files: jsoncFiles,
    plugins: { json },
    language: 'json/jsonc',
    languageOptions: { allowTrailingCommas: true },
    extends: ['json/recommended'],
  },
  {
    // Formatting issues show up as ESLint warnings in the editor; `prettier --check` enforces them.
    files: [...codeFiles, '**/*.{json,jsonc}'],
    plugins: { prettier },
    rules: { 'prettier/prettier': 'warn' },
  },
);
