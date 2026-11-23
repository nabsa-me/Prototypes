import { defineConfig } from 'vitest/config';

const strict = { lines: 90, branches: 90 };

export default defineConfig({
  test: {
    projects: ['packages/*', 'backend'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'backend/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        '**/domain/**': strict,
        '**/application/**': strict,
        'packages/geo/**': strict,
      },
    },
  },
});
