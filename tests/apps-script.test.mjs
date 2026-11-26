// Runs the real apps-script/Code.gs against a fake in-memory Google Sheet.
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRuntime } from './fake-apps-script/runtime.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CODE = path.join(dir, '../apps-script/Code.gs');
const SECRET = 'unit-test-secret';

function setup() {
  const rt = createRuntime(CODE, { secret: SECRET });
  const call = (body) => JSON.parse(rt.doPost(JSON.stringify({ secret: SECRET, ...body })));
  return { rt, call };
}

const entry = (over = {}) => ({
  id: 'id-1',
  workDate: '2026-11-20',
  userName: 'Kavin',
  userEmail: 'demo@workpulse.local',
  projectName: 'FFS – Cleaning of Parisson Area',
  taskDescription: 'Collision setup',
  hoursSpent: 6.5,
  status: 'COMPLETED',
  priority: 'HIGH',
  simulationCategory: 'WORKED',
  simulationWorkedNumber: 2,
  isCarriedForward: false,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  ...over
});

test('rejects a wrong secret', () => {
  const { rt } = setup();
  const res = JSON.parse(rt.doPost(JSON.stringify({ secret: 'nope', action: 'list' })));
  assert.equal(res.ok, false);
  assert.match(res.error, /Unauthorized/);
});

test('creates the sheet with headers and round-trips an entry exactly', () => {
  const { rt, call } = setup();
  assert.deepEqual(call({ action: 'list' }), { ok: true, entries: [] });
  assert.equal(call({ action: 'create', entry: entry() }).ok, true);
  const table = rt.sheet().toTable();
  assert.equal(table[0][0], 'id');
  assert.equal(table[1][1], '2026-11-20', 'workDate stays plain text, not a Date');
  const [back] = call({ action: 'list' }).entries;
  assert.deepEqual(JSON.parse(JSON.stringify(back)), entry());
});

test('update keeps createdAt and changes fields; delete removes the row', () => {
  const { rt, call } = setup();
  call({ action: 'create', entry: entry() });
  call({ action: 'update', entry: entry({ hoursSpent: 3, status: 'BLOCKED', createdAt: '2099-01-01T00:00:00.000Z' }) });
  const [e] = call({ action: 'list' }).entries;
  assert.equal(e.hoursSpent, 3);
  assert.equal(e.status, 'BLOCKED');
  assert.equal(e.createdAt, '2026-11-20T10:00:00.000Z');
  assert.equal(call({ action: 'delete', id: 'id-1' }).ok, true);
  assert.equal(rt.sheet().getLastRow(), 1);
  assert.equal(call({ action: 'delete', id: 'id-1' }).ok, false);
});

test('text that looks like a formula is stored literally (no formula injection)', () => {
  const { rt, call } = setup();
  call({ action: 'create', entry: entry({ taskDescription: '=IMPORTXML("http://evil")', remarks: '+1 call' }) });
  assert.equal(rt.sheet().formulaWrites, 0);
  const [e] = call({ action: 'list' }).entries;
  assert.equal(e.taskDescription, '=IMPORTXML("http://evil")');
  assert.equal(e.remarks, '+1 call');
});

test('import appends without duplicates and replace wipes old rows', () => {
  const { rt, call } = setup();
  call({ action: 'create', entry: entry() });
  const r1 = call({ action: 'import', mode: 'append', entries: [entry({ hoursSpent: 1 }), entry({ id: 'id-2' })] });
  assert.deepEqual([r1.added, r1.updated, r1.total], [1, 1, 2]);
  const r2 = call({ action: 'import', mode: 'replace', entries: [entry({ id: 'id-9' })] });
  assert.deepEqual([r2.added, r2.total], [1, 1]);
  assert.deepEqual(call({ action: 'list' }).entries.map((e) => e.id), ['id-9']);
  assert.equal(rt.sheet().getLastRow(), 2);
});

test('list is sorted newest work date first', () => {
  const { call } = setup();
  call({ action: 'create', entry: entry({ id: 'a', workDate: '2026-01-01' }) });
  call({ action: 'create', entry: entry({ id: 'b', workDate: '2026-03-01' }) });
  call({ action: 'create', entry: entry({ id: 'c', workDate: '2026-02-01' }) });
  assert.deepEqual(call({ action: 'list' }).entries.map((e) => e.id), ['b', 'c', 'a']);
});
