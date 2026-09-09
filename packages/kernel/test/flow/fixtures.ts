// Flows for the interpreter tests, written as YAML and parsed with U-007's parsePack,
// so every flow under test is one the pack validator already accepts.
import { parsePack } from '../../src/index.ts';

const MANIFEST = ['id: van-sales', 'name: Van Sales', 'category: Field app', 'version: 1.0.0', 'kind: module', 'variables:', '  employeeCode: EMP-001', ''].join('\n');

/** Parse one flow document out of a minimal pack. */
export function flowDoc(yaml: string): unknown {
  const { pack } = parsePack({ 'pack.yaml': MANIFEST, 'flows/f.yaml': yaml });
  const file = pack.files.find(f => f.kind === 'flow');
  if (!file) throw new Error('fixture did not parse as a flow');
  return file.doc;
}

export const dayCycle = [
  '$schemaVersion: 1',
  'id: app.day-cycle',
  'steps:',
  '  - id: login',
  '    kind: request',
  '    method: POST',
  '    url: "{{app_api}}/check/login"',
  '    body: "{{fixtures.login}}"',
  '    extract:',
  '      token: $.data.token',
  '      cycleNo: $.data.cycleNo',
  '    assert:',
  '      - status: 200',
  '      - path: $.data.token',
  '        matches: "^tok-"',
  '  - id: day-begin',
  '    kind: request',
  '    needs: [login]',
  '    method: POST',
  '    url: "{{app_api}}/day/begin"',
  '    headers:',
  '      Authorization: "Bearer {{token}}"',
  '    assert:',
  '      - status: 200',
  '      - lte: 500',
  '      - path: $.data.cycleNo',
  '        gte: 1',
  '  - id: cycle-open',
  '    kind: query',
  '    needs: [day-begin]',
  '    source: fa_txn',
  '    sql: SELECT COUNT(*) AS n FROM VanCycle WHERE EmployeeCode = {{employeeCode}}',
  '    assert:',
  '      - rows: 1',
  '      - path: $[0].n',
  '        equals: 1',
  '',
].join('\n');

export const withWaitAndGroup = [
  '$schemaVersion: 1',
  'id: app.group',
  'steps:',
  '  - id: settle',
  '    kind: wait',
  '    seconds: 2',
  '  - id: checks',
  '    kind: group',
  '    steps:',
  '      - id: one',
  '        kind: request',
  '        method: GET',
  '        url: "{{app_api}}/a"',
  '        assert:',
  '          - status: 200',
  '      - id: two',
  '        kind: request',
  '        method: GET',
  '        url: "{{app_api}}/b"',
  '        assert:',
  '          - status: 200',
  '',
].join('\n');

export const withScriptStep = ['$schemaVersion: 1', 'id: app.script', 'steps:', '  - id: transform', '    kind: script', '    expression: "1 + 1"', ''].join('\n');

export const withUnknownVariable = ['$schemaVersion: 1', 'id: app.unknown', 'steps:', '  - id: go', '    kind: request', '    method: GET', '    url: "{{app_api}}/{{nowhere}}"', ''].join('\n');

export const withContainsAndDelta = [
  '$schemaVersion: 1',
  'id: app.tolerances',
  'variables:',
  '  expectedTotal: 100',
  'steps:',
  '  - id: totals',
  '    kind: query',
  '    source: dms',
  '    sql: SELECT total, code FROM VanStock',
  '    assert:',
  '      - path: $.codes',
  '        contains: VAN-7',
  '      - path: $.total',
  '        equals: 100',
  '        delta: 2',
  '',
].join('\n');

export const twoIndependentSteps = [
  '$schemaVersion: 1',
  'id: app.independent',
  'steps:',
  '  - id: failing',
  '    kind: request',
  '    method: GET',
  '    url: "{{app_api}}/a"',
  '    assert:',
  '      - status: 200',
  '  - id: erroring',
  '    kind: request',
  '    method: GET',
  '    url: "{{app_api}}/b"',
  '    assert:',
  '      - status: 200',
  '',
].join('\n');

export const context = {
  scope: { env: 'beta', tenant: 'mars', company: '234474', user: 'DSR-1', dateFrom: '2026-08-01', dateTo: '2026-08-31' },
  variables: { employeeCode: 'EMP-001' },
  fixtures: { login: { username: 'EMP-001' } },
  bases: { app_api: 'https://app.example', dashboard_api: 'https://dash.example' },
};
