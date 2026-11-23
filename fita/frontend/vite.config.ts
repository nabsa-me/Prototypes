import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type UserConfig } from 'vite';

const root = new URL('../', import.meta.url);
const envFile = existsSync(new URL('.env', root)) ? '.env' : '.env.example';
process.loadEnvFile(fileURLToPath(new URL(envFile, root)));

function port(name: string): number {
  const value = process.env[name] ?? '';
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be a TCP port, got "${value}"`);
  }
  return parsed;
}

export default defineConfig(({ mode }): UserConfig => {
  const base: UserConfig = { plugins: [svelte()] };
  // Vitest loads this file in 'test' mode, where no dev server runs.
  if (mode === 'test') return base;

  return {
    ...base,
    server: {
      host: '127.0.0.1',
      port: port('WEB_PORT'),
      strictPort: true,
      // Same origin for the API: no CORS, and the backend stays on localhost.
      proxy: { '/api': `http://127.0.0.1:${port('API_PORT')}` },
    },
  };
});
