import { z } from 'zod';

/**
 * A third-party service did not answer, timed out or failed on its side (5xx).
 * Passing: retrying later may work. Maps to 503.
 */
export class UpstreamUnavailableError extends Error {
  constructor(service: string, detail: string, options?: { cause: unknown }) {
    super(`${service} is unavailable: ${detail}`, options);
    this.name = 'UpstreamUnavailableError';
  }
}

/** A third-party service answered, but not as its contract says. Maps to 502. */
export class UpstreamContractError extends Error {
  constructor(service: string, detail: string) {
    super(`${service} answered outside its contract: ${detail}`);
    this.name = 'UpstreamContractError';
  }
}

/**
 * A third-party service rejected our request (4xx). The request is built by this code,
 * so this is a defect or broken configuration, never the end user's fault. Maps to 500.
 */
export class UpstreamRequestError extends Error {
  constructor(service: string, status: number) {
    super(`${service} rejected the request with HTTP ${status}`);
    this.name = 'UpstreamRequestError';
  }
}

/** Failures that belong to the third party, as opposed to defects in this code. */
export function isThirdPartyFailure(error: unknown): boolean {
  return error instanceof UpstreamUnavailableError || error instanceof UpstreamContractError;
}

export interface UpstreamOptions {
  service: string;
  timeoutMs: number;
}

/** GETs a JSON document once, with a timeout and no retries, and validates it with `schema`. */
export async function getUpstreamJson<S extends z.ZodType>(
  url: string,
  schema: S,
  { service, timeoutMs }: UpstreamOptions,
): Promise<z.infer<S>> {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: 'application/json' }, signal });
  } catch (error) {
    throw classifyTransportError(service, error);
  }

  if (response.status >= 500) {
    throw new UpstreamUnavailableError(service, `HTTP ${response.status}`);
  }
  if (response.status >= 400) throw new UpstreamRequestError(service, response.status);

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new UpstreamContractError(service, 'the body is not JSON');
    }
    throw classifyTransportError(service, error);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new UpstreamContractError(service, z.prettifyError(result.error));
  }
  return result.data;
}

/** fetch rejects with TypeError on network failures and with a DOMException on timeout. */
function classifyTransportError(service: string, error: unknown): unknown {
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new UpstreamUnavailableError(service, 'timed out', { cause: error });
  }
  if (error instanceof TypeError) {
    return new UpstreamUnavailableError(service, 'network failure', { cause: error });
  }
  return error;
}
