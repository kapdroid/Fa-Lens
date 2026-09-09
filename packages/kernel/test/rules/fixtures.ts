// One rule per declarative type, in the shape packs already write (see packages/kernel/test/pack/fixtures.ts).
import type { Scope } from '../../src/index.ts';

export const scope: Scope = { env: 'beta', tenant: 'mars', company: '234474', user: 'DSR-1', dateFrom: '2026-08-01', dateTo: '2026-08-31' };

export const presence = { id: 'orders-present', type: 'presence' as const, source: 'fa_txn', table: 'VanOrder', keys: ['OrderNo'] };

export const uniqueness = { id: 'orders-unique', type: 'uniqueness' as const, source: 'fa_txn', table: 'VanOrder', keys: ['OrderNo', 'CompanyId'] };

export const fieldMatch = {
  id: 'order-amount-match', type: 'field_match' as const, source: 'fa_txn', keys: ['OrderNo'], columns: ['NetAmount'],
  anchor: { table: 'VanOrder' }, enrich: { source: 'dms', table: 'OrderLedger' },
};

export const aggregateMatch = {
  id: 'cycle-balance', type: 'aggregate_match' as const, source: 'fa_txn', window: 'day',
  anchor: { table: 'VanCycleStock', measure: 'Quantity', keys: ['CycleNo', 'ProductCode'] },
  enrich: { source: 'dms', table: 'VanStockLedger', measure: 'Qty', keys: ['CycleNo', 'ProductCode'] },
};

export const chain = {
  id: 'order-to-invoice', type: 'chain' as const, source: 'fa_txn', keys: ['OrderNo'],
  anchor: { table: 'VanOrder' }, enrich: { source: 'dms', table: 'Invoice' },
};

export const customCheck = { id: 'cycle-open-close', type: 'custom-check' as const, source: 'fa_txn', ref: 'van-sales/cycle-open-close' };

export const allRules = [presence, uniqueness, fieldMatch, aggregateMatch, chain, customCheck];
