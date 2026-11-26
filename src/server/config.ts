// Server-only configuration, read from environment variables.
// Never import this file from a 'use client' component.

export type StorageMode = 'sheets' | 'local' | 'misconfigured';

const SCRIPT_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
const LOCAL_TEST_PATTERN = /^http:\/\/127\.0\.0\.1:\d+\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

export function getServerConfig() {
  const appPassword = process.env.APP_PASSWORD || '';
  const scriptUrl = (process.env.GOOGLE_SCRIPT_URL || '').trim();
  const scriptSecret = process.env.GOOGLE_SCRIPT_SECRET || '';

  // ALLOW_LOCAL_SCRIPT_URL=1 is only for automated tests against a local fake Apps Script.
  const scriptUrlValid =
    SCRIPT_URL_PATTERN.test(scriptUrl) ||
    (process.env.ALLOW_LOCAL_SCRIPT_URL === '1' && LOCAL_TEST_PATTERN.test(scriptUrl));
  const authRequired = appPassword.length > 0;

  let storage: StorageMode = 'local';
  let storageProblem: string | null = null;
  if (scriptUrl) {
    if (!scriptUrlValid) {
      storage = 'misconfigured';
      storageProblem = 'GOOGLE_SCRIPT_URL must look like https://script.google.com/macros/s/<id>/exec';
    } else if (!scriptSecret) {
      storage = 'misconfigured';
      storageProblem = 'GOOGLE_SCRIPT_SECRET is missing.';
    } else if (!authRequired) {
      // Without a password anyone on the internet could read and change the sheet.
      storage = 'misconfigured';
      storageProblem = 'APP_PASSWORD must be set before Google Sheets storage is enabled.';
    } else {
      storage = 'sheets';
    }
  }

  return {
    appPassword,
    authRequired,
    scriptUrl,
    scriptSecret,
    storage,
    storageProblem,
    sessionSecret: process.env.SESSION_SECRET || '',
    user: {
      name: process.env.APP_USER_NAME || 'WorkPulse User',
      email: process.env.APP_USER_EMAIL || 'user@workpulse.local'
    }
  };
}
