// ADR-0002: the registry is the single source the three skins generate from. If a verb can be declared
// anywhere else, parity is back to being a matter of discipline.
import { expect, test } from 'vitest';
import { VERBS, verbNames } from '../src/index.ts';

test('every verb declares a name, a description, an input schema and an output schema', () => {
  for (const [name, verb] of Object.entries(VERBS)) {
    expect(verb.name, `${name} must carry its own name`).toBe(name);
    expect(verb.description.length, `${name} needs a description a person can read in a tool list`).toBeGreaterThan(15);
    expect(typeof verb.input.parse, `${name} needs a Zod input schema`).toBe('function');
    expect(typeof verb.output.parse, `${name} needs a Zod output schema`).toBe('function');
    expect(typeof verb.handler).toBe('function');
  }
});

test('names are unique and snake_case, so a skin can expose them verbatim', () => {
  const names = verbNames();
  expect(new Set(names).size).toBe(names.length);
  for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
});

test('the first verbs the product needs are all here', () => {
  expect(verbNames().sort()).toEqual(['create_run', 'get_matrix', 'get_run', 'list_flows', 'list_modules']);
});
