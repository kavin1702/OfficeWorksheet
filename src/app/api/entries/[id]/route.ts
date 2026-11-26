import { NextResponse } from 'next/server';
import { getServerConfig } from '@/server/config';
import { requireSheetsAccess } from '@/server/auth';
import { SheetsStore } from '@/server/sheetsClient';
import { parseEntryInput, parseId } from '@/shared/validation';
import { handleApiError as handleError } from '@/server/errors';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireSheetsAccess();
  if (denied) return denied;
  try {
    const id = parseId(params.id);
    const { user } = getServerConfig();
    const input = parseEntryInput(await request.json().catch(() => null), {
      userName: user.name,
      userEmail: user.email
    });
    const now = new Date().toISOString();
    // createdAt is kept by the Apps Script from the existing row.
    const saved = await SheetsStore.update({ ...input, id, createdAt: now, updatedAt: now });
    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const denied = await requireSheetsAccess();
  if (denied) return denied;
  try {
    await SheetsStore.remove(parseId(params.id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
