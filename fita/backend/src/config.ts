import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const port = z
  .string()
  .regex(/^\d+$/, 'must be an integer')
  .transform(Number)
  .pipe(z.number().int().min(1).max(65535));

/** Base URL of a third-party service, without a trailing slash. */
const serviceUrl = z
  .url({ protocol: /^https$/ })
  .refine((url) => !url.endsWith('/'), 'must not end with a slash');

const EnvSchema = z.object({
  API_PORT: port,
  ICGC_TERRITORI_URL: serviceUrl,
  ICGC_GEOCODER_URL: serviceUrl,
  DATABASE_PATH: z.string().regex(/\.sqlite$/, 'must end in .sqlite'),
});

export interface Config {
  apiPort: number;
  icgcTerritoriUrl: string;
  icgcGeocoderUrl: string;
  /** Absolute path of the SQLite file. */
  databasePath: string;
}

/** `rootDir` resolves relative paths: the repository root. */
export function parseConfig(env: Record<string, string | undefined>, rootDir: string): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(result.error)}`);
  }
  return {
    apiPort: result.data.API_PORT,
    icgcTerritoriUrl: result.data.ICGC_TERRITORI_URL,
    icgcGeocoderUrl: result.data.ICGC_GEOCODER_URL,
    databasePath: isAbsolute(result.data.DATABASE_PATH)
      ? result.data.DATABASE_PATH
      : resolve(rootDir, result.data.DATABASE_PATH),
  };
}

/** Loads `.env` from the repository root, falling back to `.env.example`. */
export function loadConfig(): Config {
  const root = new URL('../../', import.meta.url);
  const envFile = existsSync(new URL('.env', root)) ? '.env' : '.env.example';
  process.loadEnvFile(fileURLToPath(new URL(envFile, root)));
  return parseConfig(process.env, fileURLToPath(root));
}
