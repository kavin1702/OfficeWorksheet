import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerConfig } from './config';
import { SESSION_COOKIE, resolveSessionSecret, verifySessionToken } from './session';

export async function isAuthenticated(): Promise<boolean> {
  const config = getServerConfig();
  if (!config.authRequired) return true;
  const secret = await resolveSessionSecret(config.sessionSecret, config.appPassword);
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value, secret);
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error, ...extra }, { status });
}

/**
 * Guard for every data route: the caller must be logged in AND
 * Google Sheets storage must be fully configured.
 */
export async function requireSheetsAccess(): Promise<NextResponse | null> {
  const config = getServerConfig();
  if (!(await isAuthenticated())) return jsonError(401, 'Please sign in again.');
  if (config.storage !== 'sheets') {
    return jsonError(503, config.storageProblem || 'Google Sheets storage is not configured on the server.', {
      storage: config.storage
    });
  }
  return null;
}
