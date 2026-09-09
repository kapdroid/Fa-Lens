import { describe, expect, test } from 'vitest';
import { parsePack, validatePack } from '../../src/index.ts';
import { invalid, validPack } from './fixtures.ts';

const problemsOf = (files: Record<string, string>) => {
  const { pack, problems } = parsePack(files);
  return [...problems, ...validatePack(pack)];
};

describe('validatePack', () => {
  test('the valid fixture pack is accepted with no problems', () => {
    expect(problemsOf(validPack())).toEqual([]);
  });

  test('an undeclared {{variable}} is rejected at the step that uses it', () => {
    const p = problemsOf(invalid.undeclaredVariable());
    expect(p.some(x => x.path.startsWith('flows/day-cycle.yaml#/steps/2') && /employeeCodee/.test(x.message) && /undeclared/i.test(x.message))).toBe(true);
  });

  test('a step that needs an unknown or later step is unreachable', () => {
    const p = problemsOf(invalid.unreachableStep());
    expect(p.some(x => x.path.startsWith('flows/day-cycle.yaml#/steps/2') && /unreachable/i.test(x.message) && /never-defined/.test(x.message))).toBe(true);
  });

  test('an unknown rule type is rejected with its path', () => {
    const p = problemsOf(invalid.unknownRuleType());
    expect(p.some(x => x.path === 'rules/cycle-balance.yaml#/type' && /magic|allowed values|one of/i.test(x.message))).toBe(true);
  });

  test('a credential value that is not a vault reference is rejected', () => {
    const p = problemsOf(invalid.credentialValue());
    expect(p.some(x => x.path === 'fixtures/login.json#/password' && /vault:\/\//.test(x.message))).toBe(true);
  });

  test('a server name inside a module pack is rejected', () => {
    const p = problemsOf(invalid.serverName());
    expect(p.some(x => x.path === 'rules/cycle-balance.yaml#/server' && /server name/i.test(x.message))).toBe(true);
  });

  test('a file outside the pack layout is a problem', () => {
    const p = problemsOf({ ...validPack(), 'scripts/run.js': 'console.log(1)' });
    expect(p.some(x => x.path === 'scripts/run.js' && /layout/i.test(x.message))).toBe(true);
  });
});
