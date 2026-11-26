import { jsonError } from './auth';
import { SheetsError } from './sheetsClient';
import { ValidationError } from '@/shared/validation';

/** Turns any thrown error into a clear JSON response instead of hiding it. */
export function handleApiError(err: unknown) {
  if (err instanceof ValidationError) return jsonError(400, err.message);
  if (err instanceof SheetsError) return jsonError(err.status, err.message);
  console.error('[api]', err);
  return jsonError(500, 'Unexpected server error.');
}
