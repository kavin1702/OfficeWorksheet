// End-to-end check of WorkPulse in a real browser (Chromium via Playwright).
// Needs: the fake Apps Script on :4010 and `next start` on :3100 (see tests/e2e/README.md).
// Prints every step; exits non-zero on the first failure.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

// Playwright is installed globally on test machines (npm i -g playwright), not as a project dependency.
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = process.env.APP_URL || 'http://localhost:3100';
const SHEET = process.env.SHEET_URL || 'http://127.0.0.1:4010/__sheet';
const OUT = process.env.OUT_DIR || 'tests/e2e/output';
const PASSWORD = process.env.APP_PASSWORD || 'test-pass';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const step = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
    console.log('PASS', name);
  } catch (e) {
    results.push(['FAIL', name, e.message]);
    console.log('FAIL', name, '\n   ', e.message);
    throw e;
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const sheet = async () => (await (await fetch(SHEET)).json()).table;
const rowsWith = async (text) => (await sheet()).filter((r) => r.join('|').includes(text));

const browser = await chromium.launch();
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
page.on('dialog', (d) => d.accept());

const fillEntry = async ({ project, task, hours, status, priority, remarks, date }) => {
  const dialog = page.getByRole('dialog');
  if (date) await dialog.getByLabel('Work Date').fill(date);
  if (project) await dialog.getByLabel('Project / Simulation Name').fill(project);
  if (task !== undefined) await dialog.locator('#entry-task').fill(task);
  if (hours !== undefined) await dialog.getByLabel('Hours Spent').fill(String(hours));
  if (status) await dialog.locator('#entry-status').selectOption(status);
  if (priority) await dialog.locator('#entry-priority').selectOption(priority);
  if (remarks !== undefined) await dialog.getByLabel('Remarks / Notes').fill(remarks);
};

try {
  await step('API refuses data requests without a session (401)', async () => {
    const r = await fetch(`${APP}/api/entries`);
    assert(r.status === 401, `expected 401, got ${r.status}`);
    const r2 = await fetch(`${APP}/api/entries/import`, { method: 'POST', body: '{"entries":[]}' });
    assert(r2.status === 401, `import expected 401, got ${r2.status}`);
  });

  await step('No open CORS header any more', async () => {
    const r = await fetch(`${APP}/api/session`);
    assert(!r.headers.get('access-control-allow-origin'), 'Access-Control-Allow-Origin is still set');
  });

  await step('Opening the app redirects to /login', async () => {
    await page.goto(APP);
    await page.waitForURL('**/login');
  });

  await step('Wrong password shows an error', async () => {
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('alert').filter({ hasText: 'Wrong password' }).waitFor();
  });

  await step('Correct password opens the dashboard (empty sheet)', async () => {
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(APP + '/');
    await page.getByText('Saved to Google Sheets').waitFor();
    await page.getByText('No tasks match').waitFor();
    await page.screenshot({ path: path.join(OUT, '01-dashboard-empty.png') });
  });

  await step('Add a work log → row appears in the table and in the Google Sheet', async () => {
    await page.getByRole('button', { name: 'Add Work Log' }).click();
    await fillEntry({
      date: '2026-11-25',
      project: 'MDI – Setup and Operations',
      task: 'Built canister crimping interaction with hand tracking',
      hours: 6.5,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      remarks: 'Needs QA on Quest 3'
    });
    await page.getByRole('dialog').getByRole('button', { name: 'Save Work Log' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.getByText('Built canister crimping interaction').waitFor();
    const rows = await rowsWith('Built canister crimping');
    assert(rows.length === 1, `expected 1 sheet row, got ${rows.length}`);
    const [id, workDate, userName, , project, , hours, status, priority, remarks] = rows[0];
    assert(workDate === '2026-11-25', 'workDate ' + workDate);
    assert(userName === 'Kavin', 'userName ' + userName);
    assert(project === 'MDI – Setup and Operations', 'project ' + project);
    assert(hours === 6.5 && status === 'IN_PROGRESS' && priority === 'HIGH', `${hours} ${status} ${priority}`);
    assert(remarks === 'Needs QA on Quest 3', 'remarks ' + remarks);
    assert(/^[0-9a-f-]{36}$/.test(id), 'id should be a UUID: ' + id);
  });

  await step('Edit the log → sheet row is updated, not duplicated', async () => {
    await page.getByTitle('Edit Log').first().click();
    await fillEntry({ hours: 7, status: 'COMPLETED' });
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    const rows = await rowsWith('Built canister crimping');
    assert(rows.length === 1, `expected 1 row after edit, got ${rows.length}`);
    assert(rows[0][6] === 7 && rows[0][7] === 'COMPLETED', `got ${rows[0][6]} ${rows[0][7]}`);
  });

  await step('Duplicate and Carry Forward add new rows dated today', async () => {
    await page.getByTitle('Duplicate').first().click();
    await page.waitForTimeout(300);
    await page.getByText('Log duplicated').waitFor();
    await page.getByTitle('Carry Forward to Today').first().click();
    await page.getByText('Task carried forward').waitFor();
    const rows = await rowsWith('canister crimping');
    assert(rows.length === 3, `expected 3 rows, got ${rows.length}`);
    assert(rows.some((r) => r[5].startsWith('[Carried Forward]') && r[13] === true), 'carried-forward row missing');
  });

  await step('Validation: empty description is blocked in the form', async () => {
    await page.getByRole('button', { name: 'Add Work Log' }).click();
    await fillEntry({ task: '   ' });
    await page.getByRole('dialog').getByRole('button', { name: 'Save Work Log' }).click();
    await page.getByText('Task description cannot be empty').waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  });

  await step('Server validation rejects bad data even without the form', async () => {
    const r = await page.evaluate(async () => {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workDate: 'not-a-date', projectName: 'x', taskDescription: 'y', hoursSpent: 99 })
      });
      return { status: res.status, body: await res.json() };
    });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  await step('Import a JSON backup (append) → rows land in the sheet, formulas stay text', async () => {
    const file = path.join(OUT, 'import-sample.json');
    fs.writeFileSync(
      file,
      JSON.stringify([
        { id: 'imp-1', workDate: '2026-11-01', projectName: 'Warehouse Operations', taskDescription: 'Forklift speed limiter test', hoursSpent: 4, status: 'COMPLETED', priority: 'MEDIUM', simulationCategory: 'TESTED', simulationTestedNumber: 1, userName: 'Kavin', userEmail: 'demo@workpulse.local' },
        { id: 'imp-2', workDate: '02/11/2026', projectName: 'Lighting in Gowning', taskDescription: '=HYPERLINK("http://x")', hoursSpent: '3.5', status: 'in progress', priority: 'low' }
      ])
    );
    await page.getByRole('button', { name: /Import \/ Export/ }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import JSON (add)' }).click();
    await (await chooser).setFiles(file);
    await page.getByText('Import complete').waitFor();
    const s = await (await fetch(SHEET)).json();
    const r1 = s.table.find((r) => r[0] === 'imp-1');
    const r2 = s.table.find((r) => r[0] === 'imp-2');
    assert(r1 && r1[10] === 'TESTED' && r1[12] === 1, 'imp-1 wrong: ' + JSON.stringify(r1));
    assert(r2 && r2[1] === '2026-11-02' && r2[7] === 'IN_PROGRESS' && r2[8] === 'LOW', 'imp-2 not normalized: ' + JSON.stringify(r2));
    assert(r2[5] === '=HYPERLINK("http://x")' && s.formulaWrites === 0, 'formula was executed');
    assert(s.table.length - 1 === 5, `append should keep old rows: expected 5, got ${s.table.length - 1}`);
  });

  await step('Delete a log → row removed from the sheet', async () => {
    const before = (await sheet()).length;
    await page.getByTitle('Delete Log').first().click();
    await page.getByText('Entry deleted').waitFor();
    const after = (await sheet()).length;
    assert(after === before - 1, `rows ${before} → ${after}`);
  });

  await step('Reload: data comes back from the sheet', async () => {
    const count = (await sheet()).length - 1;
    await page.reload();
    await page.getByText('Saved to Google Sheets').waitFor();
    await page.waitForSelector('tbody tr');
    const shown = await page.locator('tbody tr').count();
    assert(shown === count, `table shows ${shown}, sheet has ${count}`);
    await page.screenshot({ path: path.join(OUT, '02-dashboard-with-data.png'), fullPage: true });
  });

  await step('Export Excel → workbook has logs + both matrices', async () => {
    await page.getByRole('button', { name: /Import \/ Export/ }).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export to Excel/ }).click();
    const download = await dl;
    const file = path.join(OUT, 'WorkPulse_Report.xlsx');
    await download.saveAs(file);
    const wb = XLSX.read(fs.readFileSync(file));
    assert(wb.SheetNames.join(',') === 'Daily Work Logs,12 Worked Simulations,7 Tested Simulations', wb.SheetNames.join(','));
    const logs = XLSX.utils.sheet_to_json(wb.Sheets['Daily Work Logs']);
    const count = (await sheet()).length - 1;
    assert(logs.length === count, `excel rows ${logs.length} vs sheet ${count}`);
    assert(XLSX.utils.sheet_to_json(wb.Sheets['12 Worked Simulations']).length === 12, 'worked matrix not 12');
    assert(XLSX.utils.sheet_to_json(wb.Sheets['7 Tested Simulations']).length === 7, 'tested matrix not 7');
    await page.keyboard.press('Escape');
  });

  await step('Export JSON backup downloads every entry', async () => {
    await page.getByRole('button', { name: /Import \/ Export/ }).click();
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: /JSON Full Backup/ }).click();
    const file = path.join(OUT, 'workpulse_backup.json');
    await (await dl).saveAs(file);
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(list.length === (await sheet()).length - 1, 'json count mismatch');
    await page.keyboard.press('Escape');
  });

  await step('Calendar: "Add Log for Day" pre-fills the chosen date', async () => {
    await page.getByRole('button', { name: /Calendar/ }).click();
    await page.getByRole('button', { name: 'Add Log for Day' }).click();
    const value = await page.getByRole('dialog').getByLabel('Work Date').inputValue();
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    assert(value === iso, `date ${value} vs selected ${iso}`);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await page.screenshot({ path: path.join(OUT, '03-calendar.png') });
  });

  await step('Matrix, Analytics, Daily Report and Team pages render', async () => {
    await page.getByRole('button', { name: /Matrix/ }).first().click();
    await page.getByText('MDI – Setup and Operations').first().waitFor();
    await page.screenshot({ path: path.join(OUT, '04-matrix.png') });
    await page.getByRole('button', { name: /Analytics/ }).click();
    await page.getByText('Task Status Breakdown').waitFor();
    await page.screenshot({ path: path.join(OUT, '05-analytics.png') });
    await page.getByRole('button', { name: /Daily Report/ }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('link', { name: /Team/ }).click();
    await page.waitForURL('**/admin');
    await page.getByText('People in the worksheet').waitFor();
    await page.screenshot({ path: path.join(OUT, '06-team.png') });
    await page.getByRole('link', { name: 'Back to dashboard' }).click();
  });

  await step('Google Sheets panel: test connection works', async () => {
    await page.getByRole('button', { name: /Google Sheets/ }).first().click();
    await page.getByRole('button', { name: 'Test connection' }).click();
    await page.getByText(/Google Sheet has \d+ rows/).waitFor();
    await page.keyboard.press('Escape');
  });

  await step('Mobile width: no horizontal scroll', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForSelector('tbody tr');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: path.join(OUT, '07-mobile.png') });
    assert(overflow <= 1, `page scrolls sideways by ${overflow}px`);
    await page.setViewportSize({ width: 1366, height: 900 });
  });

  await step('Sign out → back to login, API locked again', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
    const status = await page.evaluate(async () => (await fetch('/api/entries')).status);
    assert(status === 401, 'expected 401 after logout, got ' + status);
  });

  await step('No browser console errors during the whole run', async () => {
    const real = consoleErrors.filter((e) => !/401|Failed to load resource/.test(e));
    assert(real.length === 0, real.join('\n'));
  });
} catch {
  // already logged
} finally {
  const s = await (await fetch(SHEET)).json().catch(() => ({ table: [] }));
  fs.writeFileSync(path.join(OUT, 'sheet-output.json'), JSON.stringify(s, null, 2));
  fs.writeFileSync(
    path.join(OUT, 'sheet-output.csv'),
    s.table.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  );
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
