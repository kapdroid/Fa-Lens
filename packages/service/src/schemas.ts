// Shapes the three skins share. ADR-0002: these are the single source for validation, types, and later
// the OpenAPI and MCP schemas U-015 and U-017 generate.
import { z } from 'zod';

export const severitySchema = z.enum(['none', 'skipped', 'ok', 'warn', 'error', 'fail']);

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a date reads as YYYY-MM-DD');

export const scopeSchema = z.object({
  env: z.string().min(1),
  tenant: z.string().min(1),
  company: z.string().min(1, 'a company id is required: every read and write is scoped to one'),
  user: z.string().min(1),
  dateFrom: day,
  dateTo: day,
});

export const targetSchema = z.object({
  kind: z.enum(['flow', 'module', 'company', 'suite']),
  id: z.string().min(1),
});

export const moduleSchema = z.object({ id: z.string(), name: z.string(), group: z.string() });
export const flowSchema = z.object({ id: z.string(), name: z.string() });

export const countsSchema = z.object({
  none: z.number(), skipped: z.number(), ok: z.number(), warn: z.number(), error: z.number(), fail: z.number(),
});

export const matrixModuleSchema = z.object({
  module: z.string(),
  severity: severitySchema,
  types: z.array(z.object({ testingType: z.string(), severity: severitySchema })),
});

export type Scope = z.infer<typeof scopeSchema>;
export type Target = z.infer<typeof targetSchema>;
