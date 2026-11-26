import { NextResponse } from 'next/server';
import { getServerConfig } from '@/server/config';
import { isAuthenticated } from '@/server/auth';

export const dynamic = 'force-dynamic';

/** Tells the browser who is signed in and where data is stored. Contains no secrets. */
export async function GET() {
  const config = getServerConfig();
  const authenticated = await isAuthenticated();
  return NextResponse.json({
    success: true,
    authRequired: config.authRequired,
    authenticated,
    storage: config.storage,
    storageProblem: config.storageProblem,
    user: authenticated ? config.user : null
  });
}
