// Drizzle tables mirroring the migrations. The .sql files are the database's source of truth;
// these give the repositories types, and an integration test fails if the two drift apart.
import { bigserial, boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const packs = pgTable('packs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  kind: text('kind').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const packVersions = pgTable('pack_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: text('pack_id').notNull(),
  version: text('version').notNull(),
  contentHash: text('content_hash').notNull(),
  publishedBy: text('published_by').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
});

export const flows = pgTable('flows', {
  id: uuid('id').primaryKey().defaultRandom(),
  packVersionId: uuid('pack_version_id').notNull(),
  flowId: text('flow_id').notNull(),
  name: text('name'),
});

export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  packVersionId: uuid('pack_version_id').notNull(),
  ruleId: text('rule_id').notNull(),
  type: text('type').notNull(),
  brokenReason: text('broken_reason'),
});

export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  packVersionId: uuid('pack_version_id').notNull(),
  caseId: text('case_id').notNull(),
  kind: text('kind').notNull(),
  endpoint: text('endpoint').notNull(),
});

export const sources = pgTable('sources', {
  name: text('name').primaryKey(),
  dialect: text('dialect').notNull(),
  description: text('description'),
});

export const sourceServers = pgTable('source_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceName: text('source_name').notNull(),
  tenant: text('tenant').notNull(),
  server: text('server').notNull(),
  database: text('database'),
  replica: boolean('replica').notNull().default(true),
});

export const credentialRefs = pgTable('credential_refs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceName: text('source_name').notNull(),
  tenant: text('tenant').notNull(),
  vaultRef: text('vault_ref').notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
});

export const roles = pgTable('roles', {
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
}, t => [primaryKey({ columns: [t.userId, t.role] })]);

export const contexts = pgTable('contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  env: text('env').notNull(),
  tenant: text('tenant').notNull(),
  userId: text('user_id'),
  name: text('name').notNull(),
}, t => [index('contexts_company_idx').on(t.companyId, t.env, t.tenant)]);

export const mcpTokens = pgTable('mcp_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  scope: jsonb('scope').notNull(),
  companies: text('companies').array().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
});

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  targetKind: text('target_kind').notNull(),
  targetId: text('target_id').notNull(),
  scopeHash: text('scope_hash').notNull(),
  status: text('status').notNull().default('queued'),
  cancelRequested: boolean('cancel_requested').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, t => [index('runs_company_created_idx').on(t.companyId, t.createdAt)]);

export const runSteps = pgTable('run_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull(),
  stepId: text('step_id').notNull(),
  windowFrom: date('window_from'),
  windowTo: date('window_to'),
  status: text('status').notNull(),
  rowsLookedAt: integer('rows_looked_at').notNull().default(0),
  truncated: boolean('truncated').notNull().default(false),
  durationMs: integer('duration_ms'),
  checkpointAt: timestamp('checkpoint_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verdicts = pgTable('verdicts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  runId: uuid('run_id'),
  module: text('module'),
  testingType: text('testing_type'),
  ruleId: text('rule_id'),
  flowId: text('flow_id'),
  severity: text('severity').notNull(),
  counts: jsonb('counts').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const evidenceRows = pgTable('evidence_rows', {
  id: uuid('id').notNull().defaultRandom(),
  companyId: text('company_id').notNull(),
  runId: uuid('run_id').notNull(),
  bucketKey: text('bucket_key').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, t => [primaryKey({ columns: [t.id, t.createdAt] })]);

export const baselines = pgTable('baselines', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const suggestions = pgTable('suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  source: text('source').notNull(),
  model: text('model').notNull(),
  promptHash: text('prompt_hash').notNull(),
  status: text('status').notNull().default('new'),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: text('company_id').notNull(),
  status: text('status').notNull().default('open'),
  title: text('title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  companyId: text('company_id'),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  detail: jsonb('detail').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});

export const cacheEntries = pgTable('cache_entries', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

/** Every table a migration must have created. The drift test reads this list. */
export const TABLES = [
  'packs', 'pack_versions', 'flows', 'rules', 'cases', 'sources', 'source_servers', 'credential_refs',
  'users', 'roles', 'contexts', 'mcp_tokens',
  'runs', 'run_steps', 'verdicts', 'evidence_rows', 'baselines',
  'suggestions', 'issues', 'audit_log',
  'cache_entries',
] as const;

/** Tables whose rows belong to one company; every read and write of these goes through the tenant guard. */
export const COMPANY_SCOPED = ['contexts', 'runs', 'verdicts', 'evidence_rows', 'baselines', 'suggestions', 'issues'] as const;
