// JSON Schema documents (draft-07) for every file kind of a pack (ADR-0010 layout, ADR-0003 flows).
// Kept as TypeScript objects so they type-check and import without resolveJsonModule; still plain JSON Schema.
import type { AnySchema } from 'ajv';

export const LOGICAL_SOURCES = ['fa_txn', 'fa_master', 'report', 'dms', 'unify'] as const;
export const RULE_TYPES = ['uniqueness', 'presence', 'field_match', 'aggregate_match', 'chain', 'custom_check'] as const;
export const STEP_KINDS = ['request', 'query', 'validate', 'wait', 'group', 'script'] as const;
export const CASE_KINDS = ['happy', 'negative', 'security', 'boundary', 'manual'] as const;

const id = { type: 'string', pattern: '^[a-z0-9][a-z0-9._-]*$' };

export const packSchema: AnySchema = {
  type: 'object',
  required: ['id', 'name', 'category', 'version', 'kind'],
  additionalProperties: false,
  properties: {
    id,
    name: { type: 'string', minLength: 1 },
    category: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    kind: { enum: ['module', 'sync'] },
    tabs: { type: 'array', items: { type: 'string' } },
    variables: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] } },
  },
};

const assertion = {
  type: 'object',
  additionalProperties: false,
  properties: {
    path: { type: 'string' },
    status: { type: 'integer' },
    schema: { type: 'object' },
    equals: {},
    lte: { type: 'number' },
    gte: { type: 'number' },
    rows: { type: 'integer' },
    contains: {},
    matches: { type: 'string' },
    delta: { type: 'number' },
  },
};

export const flowSchema: AnySchema = {
  type: 'object',
  required: ['$schemaVersion', 'id', 'steps'],
  additionalProperties: false,
  properties: {
    $schemaVersion: { const: 1 },
    id,
    name: { type: 'string' },
    description: { type: 'string' },
    variables: { type: 'object' },
    steps: { type: 'array', minItems: 1, items: { $ref: '#/definitions/step' } },
  },
  definitions: {
    step: {
      type: 'object',
      required: ['id', 'kind'],
      properties: {
        id,
        kind: { enum: [...STEP_KINDS] },
        name: { type: 'string' },
        needs: { type: 'array', items: { type: 'string' } },
        method: { enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        url: { type: 'string' },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        body: {},
        source: { enum: [...LOGICAL_SOURCES] },
        sql: { type: 'string' },
        rule: { type: 'string' },
        seconds: { type: 'number', minimum: 0 },
        steps: { type: 'array', items: { $ref: '#/definitions/step' } },
        expression: { type: 'string' },
        extract: { type: 'object', additionalProperties: { type: 'string' } },
        assert: { type: 'array', items: assertion },
      },
    },
  },
};

export const ruleSchema: AnySchema = {
  type: 'object',
  required: ['id', 'type', 'source'],
  properties: {
    id,
    name: { type: 'string' },
    type: { enum: [...RULE_TYPES] },
    source: { enum: [...LOGICAL_SOURCES] },
    table: { type: 'string' },
    keys: { type: 'array', items: { type: 'string' } },
    columns: { type: 'array', items: { type: 'string' } },
    anchor: { type: 'object' },
    enrich: { type: 'object' },
    window: { type: 'string' },
    ref: { type: 'string' },
  },
};

export const caseSchema: AnySchema = {
  type: 'object',
  required: ['id', 'kind', 'endpoint'],
  properties: {
    id,
    kind: { enum: [...CASE_KINDS] },
    endpoint: { type: 'string', pattern: '^(GET|POST|PUT|PATCH|DELETE) ' },
    body: {},
    expect: { type: 'object' },
    notes: { type: 'string' },
  },
};

export const drilldownSchema: AnySchema = {
  type: 'object',
  required: ['levels'],
  properties: {
    levels: { type: 'array', minItems: 1, items: { type: 'string' } },
    columns: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
  },
};

export const presetsSchema: AnySchema = { type: 'object' };

export const catalogRefsSchema: AnySchema = {
  type: 'object',
  properties: {
    sources: { type: 'array', items: { enum: [...LOGICAL_SOURCES] } },
    endpoints: { type: 'array', items: { type: 'string' } },
  },
};
