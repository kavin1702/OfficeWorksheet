import { NextResponse } from 'next/server';
import { getServerConfig } from '@/server/config';
import { requireSheetsAccess } from '@/server/auth';
import { handleApiError as handleError } from '@/server/errors';
import { SheetsStore } from '@/server/sheetsClient';
import { parseEntryInput } from '@/shared/validation';
import { WorkEntry } from '@/shared/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireSheetsAccess();
  if (denied) return denied;
  try {
    const entries = await SheetsStore.list();
    return NextResponse.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  const denied = await requireSheetsAccess();
  if (denied) return denied;
  try {
    const { user } = getServerConfig();
    const input = parseEntryInput(await request.json().catch(() => null), {
      userName: user.name,
      userEmail: user.email
    });
    const now = new Date().toISOString();
    const entry: WorkEntry = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    const saved = await SheetsStore.create(entry);
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
