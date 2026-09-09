// A local http server per test file. No network, no container: the adapter's guards, budgets and breaker
// are all observable from here.
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface TestServer {
  origin: string;
  /** How many requests were in flight at the busiest moment. */
  peakInFlight: number;
  requests: { method: string; url: string; authorization?: string }[];
  close: () => Promise<void>;
}

export interface ServerBehaviour {
  delayMs?: number;
  status?: number;
  body?: () => string;
  failFirst?: number;
}

export async function startTestServer(behaviour: ServerBehaviour = {}): Promise<TestServer> {
  let inFlight = 0;
  let failures = 0;
  const state: TestServer = { origin: '', peakInFlight: 0, requests: [], close: async () => {} };
  const server: Server = createServer((req, res) => {
    inFlight += 1;
    state.peakInFlight = Math.max(state.peakInFlight, inFlight);
    const auth = req.headers.authorization;
    state.requests.push({ method: req.method ?? '', url: req.url ?? '', ...(auth === undefined ? {} : { authorization: auth }) });
    const finish = () => {
      inFlight -= 1;
      if (behaviour.failFirst !== undefined && failures < behaviour.failFirst) {
        failures += 1;
        res.writeHead(500).end('nope');
        return;
      }
      res.writeHead(behaviour.status ?? 200, { 'content-type': 'application/json' });
      res.end(behaviour.body ? behaviour.body() : JSON.stringify({ data: { token: 'tok-abc' } }));
    };
    if (behaviour.delayMs) setTimeout(finish, behaviour.delayMs); else finish();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  state.origin = `http://127.0.0.1:${port}`;
  state.close = () => new Promise<void>(resolve => { server.closeAllConnections?.(); server.close(() => resolve()); });
  return state;
}
