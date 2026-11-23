import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeResponse {
  status: number;
  body: string;
  delayMs?: number;
}

export interface FakeUpstream {
  baseUrl: string;
  /** Every request received, as path plus query string. */
  requests: string[];
  close(): Promise<void>;
}

/** Local HTTP server on a random port that answers recorded responses. Test-only. */
export async function startFakeUpstream(
  respond: (url: URL) => FakeResponse,
): Promise<FakeUpstream> {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake.test');
    requests.push(`${url.pathname}${url.search}`);
    const answer = respond(url);
    const send = () => {
      response.writeHead(answer.status, { 'content-type': 'application/json; charset=utf-8' });
      response.end(answer.body);
    };
    if (answer.delayMs) setTimeout(send, answer.delayMs);
    else send();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

/** Reads a recorded response body stored next to the adapter tests. */
export function fixture(directory: URL, name: string): string {
  return readFileSync(new URL(name, directory), 'utf8');
}
