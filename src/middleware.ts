import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, resolveSessionSecret, verifySessionToken } from '@/server/session';

// Sends visitors to /login when a password is set and they have no valid session.
// API routes check the session themselves and answer 401 instead of redirecting.
export async function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD || '';
  if (!password) return NextResponse.next();

  const secret = await resolveSessionSecret(process.env.SESSION_SECRET || '', password);
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (ok) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/', '/admin/:path*']
};
