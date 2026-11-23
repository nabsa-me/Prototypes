import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { startFakeUpstream, type FakeResponse, type FakeUpstream } from './fake-upstream.ts';
import {
  UpstreamContractError,
  UpstreamRequestError,
  UpstreamUnavailableError,
  getUpstreamJson,
  isThirdPartyFailure,
} from './upstream.ts';

const Schema = z.object({ name: z.string() });
const options = { service: 'Test service', timeoutMs: 200 };

describe('getUpstreamJson', () => {
  let upstream: FakeUpstream | undefined;

  afterEach(async () => {
    await upstream?.close();
    upstream = undefined;
  });

  async function serve(answer: FakeResponse) {
    upstream = await startFakeUpstream(() => answer);
    return `${upstream.baseUrl}/resource`;
  }

  it('returns the validated body', async () => {
    const url = await serve({ status: 200, body: '{"name":"Fita","extra":1}' });

    await expect(getUpstreamJson(url, Schema, options)).resolves.toEqual({ name: 'Fita' });
  });

  it('reports a 5xx as unavailable', async () => {
    const url = await serve({ status: 503, body: '{}' });

    await expect(getUpstreamJson(url, Schema, options)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
  });

  it('reports a 4xx as a rejected request, not as unavailable', async () => {
    const url = await serve({ status: 404, body: '{}' });

    await expect(getUpstreamJson(url, Schema, options)).rejects.toBeInstanceOf(
      UpstreamRequestError,
    );
  });

  it('reports a body that is not JSON as a contract breach', async () => {
    const url = await serve({ status: 200, body: '<html>' });

    await expect(getUpstreamJson(url, Schema, options)).rejects.toBeInstanceOf(
      UpstreamContractError,
    );
  });

  it('reports a body outside the schema as a contract breach', async () => {
    const url = await serve({ status: 200, body: '{"name":42}' });

    await expect(getUpstreamJson(url, Schema, options)).rejects.toBeInstanceOf(
      UpstreamContractError,
    );
  });

  it('gives up after the timeout and reports unavailable', async () => {
    const url = await serve({ status: 200, body: '{"name":"late"}', delayMs: 1000 });

    await expect(getUpstreamJson(url, Schema, options)).rejects.toThrow(/timed out/);
  });

  it('reports a refused connection as unavailable', async () => {
    const url = await serve({ status: 200, body: '{}' });
    await upstream?.close();
    upstream = undefined;

    await expect(getUpstreamJson(url, Schema, options)).rejects.toThrow(/network failure/);
  });
});

describe('isThirdPartyFailure', () => {
  it('accepts third-party failures and rejects defects', () => {
    expect([
      isThirdPartyFailure(new UpstreamUnavailableError('s', 'd')),
      isThirdPartyFailure(new UpstreamContractError('s', 'd')),
      isThirdPartyFailure(new UpstreamRequestError('s', 400)),
      isThirdPartyFailure(new TypeError('bug')),
    ]).toEqual([true, true, false, false]);
  });
});
