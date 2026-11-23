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

export async function getJson<S extends z.ZodType>(
  url: string,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal });
  return readJson(response, schema);
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
