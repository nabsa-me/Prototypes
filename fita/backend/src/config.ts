import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const port = z
  .string()
  .regex(/^\d+$/, 'must be an integer')
  .transform(Number)
  .pipe(z.number().int().min(1).max(65535));

const EnvSchema = z.object({
  API_PORT: port,
});

export interface Config {
  apiPort: number;
}

export function parseConfig(env: Record<string, string | undefined>): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  return { apiPort: result.data.API_PORT };
}

/** Loads `.env` from the repository root, falling back to `.env.example`. */
export function loadConfig(): Config {
  const root = new URL('../../', import.meta.url);
  const envFile = existsSync(new URL('.env', root)) ? '.env' : '.env.example';
  process.loadEnvFile(fileURLToPath(new URL(envFile, root)));
  return parseConfig(process.env);
}
