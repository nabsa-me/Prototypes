import { ApiErrorSchema } from '@fita/contracts';
import type { z } from 'zod';

/** Any failed API call: the server's own error, or a response that breaks the contract. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Sends a request and validates the JSON answer against `schema`. */
export async function requestJson<S extends z.ZodType>(
  url: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.infer<S>> {
  const headers: Record<string, string> = { accept: 'application/json', ...options.headers };
  if (options.body !== undefined) headers['content-type'] = 'application/json';

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  return readJson(response, schema);
}

export function getJson<S extends z.ZodType>(
  url: string,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  return requestJson(url, schema, { signal });
}

async function readJson<S extends z.ZodType>(response: Response, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError(response.status, 'invalid_response', 'The response is not JSON');
  }

  if (!response.ok) {
    const error = ApiErrorSchema.safeParse(body);
    if (error.success) {
      throw new ApiRequestError(response.status, error.data.error.code, error.data.error.message);
    }
    throw new ApiRequestError(response.status, 'http_error', `HTTP ${response.status}`);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiRequestError(
      response.status,
      'invalid_response',
      'The response does not match the contract',
    );
  }
  return result.data;
}
