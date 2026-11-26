import { NextResponse } from 'next/server';
import { getServerConfig } from '@/server/config';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, resolveSessionSecret, safeEqual } from '@/server/session';
import { jsonError } from '@/server/auth';

export const dynamic = 'force-dynamic';

// Simple per-instance brute-force protection: 10 failed tries per IP per 15 minutes.
const failures = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

export async function POST(request: Request) {
  const config = getServerConfig();
  if (!config.authRequired) {
    return jsonError(400, 'Login is not enabled. Set APP_PASSWORD on the server to turn it on.');
  }

  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const record = failures.get(ip);
  if (record && Date.now() - record.first < WINDOW_MS && record.count >= MAX_FAILURES) {
    return jsonError(429, 'Too many wrong passwords. Try again in 15 minutes.');
  }

  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return jsonError(400, 'Send JSON like {"password": "..."}');
  }

  if (!(await safeEqual(password, config.appPassword))) {
    const r = record && Date.now() - record.first < WINDOW_MS ? record : { count: 0, first: Date.now() };
    r.count += 1;
    failures.set(ip, r);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return jsonError(401, 'Wrong password.');
  }

  failures.delete(ip);
  const secret = await resolveSessionSecret(config.sessionSecret, config.appPassword);
  const token = await createSessionToken(secret);
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS
  });
  return res;
}
