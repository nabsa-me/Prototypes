import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiRequestError, getJson, requestJson } from './http.ts';

const Schema = z.strictObject({ name: z.string() });

function respondWith(body: string, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () => new Response(body, { status, headers: { 'content-type': 'application/json' } }),
    ),
  );
}

async function failure(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof ApiRequestError)) throw new Error('Expected an ApiRequestError');
  return error;
}

describe('getJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the body when it matches the schema', async () => {
    respondWith('{"name":"Fita"}');

    await expect(getJson('/api/x', Schema)).resolves.toEqual({ name: 'Fita' });
  });

  it('rejects a successful body that breaks the contract', async () => {
    respondWith('{"name":42}');

    const error = await failure(getJson('/api/x', Schema));

    expect(error.code).toBe('invalid_response');
  });

  it('surfaces the API error code and message', async () => {
    respondWith('{"error":{"code":"viewer_not_found","message":"Missing"}}', 404);

    const error = await failure(getJson('/api/x', Schema));

    expect([error.status, error.code, error.message]).toEqual([404, 'viewer_not_found', 'Missing']);
  });

  it('reports an error body outside the API format as a plain HTTP error', async () => {
    respondWith('{"oops":true}', 502);

    const error = await failure(getJson('/api/x', Schema));

    expect([error.status, error.code]).toEqual([502, 'http_error']);
  });

  it('sends a JSON body with its content type and extra headers', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response('{"name":"Fita"}', { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await requestJson('/api/x', Schema, {
      method: 'POST',
      body: { a: 1 },
      headers: { 'x-admin-token': 't' },
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toMatchObject({
      'content-type': 'application/json',
      'x-admin-token': 't',
    });
  });

  it('rejects a body that is not JSON', async () => {
    respondWith('<html>', 200);

    const error = await failure(getJson('/api/x', Schema));

    expect(error.code).toBe('invalid_response');
  });
});
