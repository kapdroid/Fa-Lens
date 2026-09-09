import type { ResolvedServer, ResolvedStep } from '../../src/index.ts';

export function server(origin: string, over: Partial<ResolvedServer> = {}): ResolvedServer {
  return {
    source: 'app_api',
    kind: 'http',
    server: 'app-api-mars',
    baseUrl: origin,
    methods: ['GET', 'HEAD'],
    budget: { concurrency: 4, timeoutMs: 1000 },
    ...over,
  };
}

export function step(s: ResolvedServer, over: Partial<ResolvedStep> = {}): ResolvedStep {
  return { stepId: 'login', server: s, method: 'GET', url: `${s.baseUrl}/check/login`, ...over };
}

export async function first<T>(stream: AsyncIterable<T>): Promise<T> {
  for await (const chunk of stream) return chunk;
  throw new Error('the adapter yielded nothing');
}
