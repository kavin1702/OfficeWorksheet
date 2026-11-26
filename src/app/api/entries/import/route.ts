import { NextResponse } from 'next/server';
import { getServerConfig } from '@/server/config';
import { jsonError, requireSheetsAccess } from '@/server/auth';
import { SheetsStore } from '@/server/sheetsClient';
import { LIMITS, parseImportedEntry } from '@/shared/validation';
import { handleApiError as handleError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** Body: { entries: WorkEntry[], mode: "append" | "replace" } */
export async function POST(request: Request) {
  const denied = await requireSheetsAccess();
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => null);
    const list = body?.entries;
    const mode = body?.mode === 'replace' ? 'replace' : 'append';
    if (!Array.isArray(list)) return jsonError(400, 'entries must be an array.');
    if (list.length > LIMITS.maxImport) return jsonError(400, `You can import at most ${LIMITS.maxImport} entries at once.`);

    const { user } = getServerConfig();
    const defaults = { userName: user.name, userEmail: user.email };
    const entries = list.map((raw: unknown, i: number) => {
      try {
        return parseImportedEntry(raw, defaults);
      } catch (err) {
        throw Object.assign(err as Error, { message: `Entry ${i + 1}: ${(err as Error).message}` });
      }
    });
    const result = await SheetsStore.importAll(entries, mode);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return handleError(err);
  }
}
