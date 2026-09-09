// The bus (ADR-0004): LISTEN/NOTIFY on its own connection. Events are pointers, never state — a client
// that misses one re-fetches — so the payload is capped well inside Postgres's 8 KB notify limit.
import { Client } from 'pg';

export const MAX_PAYLOAD_BYTES = 7000;

export interface Bus {
  publish: (channel: string, payload: unknown) => Promise<void>;
  subscribe: (channel: string, handler: (payload: unknown) => void) => Promise<void>;
  close: () => Promise<void>;
}

/** Channel names become SQL identifiers, so only word characters and a colon are allowed through. */
function channelIdentifier(channel: string): string {
  if (!/^[A-Za-z][\w:-]{0,60}$/.test(channel)) throw new Error(`bus: '${channel}' is not a usable channel name`);
  return `"${channel.replace(/"/g, '')}"`;
}

export function pgBus(connectionString: string): Bus {
  let client: Client | undefined;
  let closed = false;
  const handlers = new Map<string, ((payload: unknown) => void)[]>();

  const connect = async (): Promise<Client> => {
    if (client) return client;
    const c = new Client({ connectionString });
    await c.connect();
    c.on('notification', message => {
      const list = handlers.get(message.channel) ?? [];
      let payload: unknown;
      try { payload = message.payload === undefined ? undefined : JSON.parse(message.payload); } catch { payload = message.payload; }
      for (const handler of list) handler(payload);
    });
    // A dropped connection loses nothing durable, but a listener that stays deaf does: reconnect and
    // listen again on every channel that still has a handler. Clients re-fetch what they missed.
    c.on('error', () => { if (client === c) { client = undefined; void relisten(); } });
    client = c;
    for (const channel of handlers.keys()) await c.query(`LISTEN ${channelIdentifier(channel)}`);
    return c;
  };

  const relisten = async (attempt = 1): Promise<void> => {
    if (closed || handlers.size === 0) return;
    try { await connect(); } catch {
      if (attempt >= 10) return;
      await new Promise(resolve => setTimeout(resolve, Math.min(100 * attempt, 1000)));
      await relisten(attempt + 1);
    }
  };

  return {
    async publish(channel, payload) {
      const text = JSON.stringify(payload) ?? 'null';
      if (Buffer.byteLength(text, 'utf8') > MAX_PAYLOAD_BYTES) {
        throw new Error(`bus: payload is larger than 8 KB; publish a pointer such as { runId, seq } and let the client re-fetch`);
      }
      const c = await connect();
      await c.query(`NOTIFY ${channelIdentifier(channel)}, ${c.escapeLiteral(text)}`);
    },
    async subscribe(channel, handler) {
      const c = await connect();
      handlers.set(channel, [...(handlers.get(channel) ?? []), handler]);
      await c.query(`LISTEN ${channelIdentifier(channel)}`);
    },
    async close() {
      closed = true;
      const c = client;
      client = undefined;
      handlers.clear();
      if (c) await c.end();
    },
  };
}
