import { afterAll, beforeAll, expect, test } from 'vitest';
import type { Harness } from './harness.ts';
import { startControlPlane } from './harness.ts';
import { pgBus } from '../../src/bus/bus.ts';

let h: Harness;
beforeAll(async () => { h = await startControlPlane({ migrate: false }); });
afterAll(async () => { await h?.stop(); });

test('a message published on one connection reaches a subscriber on another within a second', async () => {
  const publisher = pgBus(h.url);
  const subscriber = pgBus(h.url);
  const seen: unknown[] = [];
  await subscriber.subscribe('run:42', payload => { seen.push(payload); });
  await publisher.publish('run:42', { seq: 1 });
  await new Promise(resolve => setTimeout(resolve, 400));
  expect(seen).toEqual([{ seq: 1 }]);
  await publisher.close(); await subscriber.close();
});

test('a subscriber hears only its own channel', async () => {
  const publisher = pgBus(h.url);
  const subscriber = pgBus(h.url);
  const seen: unknown[] = [];
  await subscriber.subscribe('run:1', p => { seen.push(p); });
  await publisher.publish('run:2', { seq: 9 });
  await publisher.publish('run:1', { seq: 7 });
  await new Promise(resolve => setTimeout(resolve, 400));
  expect(seen).toEqual([{ seq: 7 }]);
  await publisher.close(); await subscriber.close();
});

test('a payload beyond the notify limit is refused, because events are pointers not state', async () => {
  const publisher = pgBus(h.url);
  await expect(publisher.publish('run:3', { blob: 'x'.repeat(9000) })).rejects.toThrow(/8 ?KB|too large/i);
  await publisher.close();
});

test('a subscriber whose connection is dropped hears the next message after reconnecting', async () => {
  const publisher = pgBus(h.url);
  const subscriber = pgBus(h.url);
  const seen: unknown[] = [];
  await subscriber.subscribe('run:99', p => { seen.push(p); });
  await publisher.publish('run:99', { seq: 1 });
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(seen).toHaveLength(1);

  await h.pool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()');
  await new Promise(resolve => setTimeout(resolve, 1200));
  await publisher.publish('run:99', { seq: 2 });
  await new Promise(resolve => setTimeout(resolve, 600));
  expect(seen).toEqual([{ seq: 1 }, { seq: 2 }]);
  await publisher.close(); await subscriber.close();
}, 30_000);
