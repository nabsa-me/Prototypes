import { fileURLToPath } from 'node:url';

export default {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  // Git stores LF (.gitattributes), so the editor's local line endings don't matter.
  endOfLine: 'auto',
  // Absolute path: the editor runs ESLint from the repository root, where a bare plugin name
  // would not resolve.
  plugins: [fileURLToPath(import.meta.resolve('prettier-plugin-svelte'))],
};
