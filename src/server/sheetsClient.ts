// Talks to the Google Apps Script web app that stores rows in Google Sheets.
// The browser never sees the script URL or the secret: only this server does.
import { WorkEntry } from '@/shared/types';
import { getServerConfig } from './config';

export class SheetsError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

type ScriptAction =
  | { action: 'ping' }
  | { action: 'list' }
  | { action: 'create'; entry: WorkEntry }
  | { action: 'update'; entry: WorkEntry }
  | { action: 'delete'; id: string }
  | { action: 'import'; entries: WorkEntry[]; mode: 'append' | 'replace' };

async function callScript<T>(payload: ScriptAction): Promise<T> {
  const { scriptUrl, scriptSecret } = getServerConfig();
  let response: Response;
  try {
    response = await fetch(scriptUrl, {
      method: 'POST',
      // text/plain avoids a CORS preflight on Google's side; the body is still JSON.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, secret: scriptSecret }),
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(25000)
    });
  } catch (err) {
    throw new SheetsError(`Could not reach Google Sheets: ${(err as Error).message}`);
  }

  const raw = await response.text();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    // Apps Script returns an HTML page when the deployment is wrong (not "Anyone" access, deleted, etc).
    throw new SheetsError(
      'Google Apps Script did not return JSON. Check that the web app is deployed with access "Anyone" and the URL ends in /exec.'
    );
  }
  if (!response.ok || !data || data.ok !== true) {
    throw new SheetsError(data?.error || `Google Apps Script error (HTTP ${response.status}).`);
  }
  return data as T;
}

export const SheetsStore = {
  ping: () => callScript<{ ok: true; count: number; sheetName: string; spreadsheetUrl?: string }>({ action: 'ping' }),
  list: async () => (await callScript<{ ok: true; entries: WorkEntry[] }>({ action: 'list' })).entries,
  create: async (entry: WorkEntry) => (await callScript<{ ok: true; entry: WorkEntry }>({ action: 'create', entry })).entry,
  update: async (entry: WorkEntry) => (await callScript<{ ok: true; entry: WorkEntry }>({ action: 'update', entry })).entry,
  remove: async (id: string) => {
    await callScript<{ ok: true }>({ action: 'delete', id });
  },
  importAll: (entries: WorkEntry[], mode: 'append' | 'replace') =>
    callScript<{ ok: true; added: number; updated: number; total: number }>({ action: 'import', entries, mode })
};
