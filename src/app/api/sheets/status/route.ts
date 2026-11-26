import { NextResponse } from 'next/server';
import { requireSheetsAccess } from '@/server/auth';
import { handleApiError } from '@/server/errors';
import { SheetsStore } from '@/server/sheetsClient';

export const dynamic = 'force-dynamic';

/** Pings the Apps Script to prove the connection works. */
export async function GET() {
  const denied = await requireSheetsAccess();
  if (denied) return denied;
  try {
    const info = await SheetsStore.ping();
    return NextResponse.json({
      success: true,
      rows: info.count,
      sheetName: info.sheetName,
      spreadsheetUrl: info.spreadsheetUrl || null
    });
  } catch (err) {
    return handleApiError(err);
  }
}
