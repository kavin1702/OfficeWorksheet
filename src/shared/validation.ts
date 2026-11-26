// Validates and cleans data that comes from the browser before it is sent to
// Google Sheets. Never trust the client: everything is checked here.
import {
  WORK_PRIORITIES,
  WORK_STATUSES,
  WorkEntry,
  WorkEntryInput,
  WorkPriority,
  WorkStatus
} from '@/shared/types';
import { normalizeDate } from '@/shared/utils/date';

export const LIMITS = {
  projectName: 200,
  taskDescription: 5000,
  remarks: 2000,
  userName: 120,
  userEmail: 200,
  maxImport: 5000
};

export class ValidationError extends Error {}

function text(value: unknown, field: string, max: number, required = false): string {
  const str = typeof value === 'string' ? value.trim() : value === undefined || value === null ? '' : String(value).trim();
  if (required && !str) throw new ValidationError(`${field} is required.`);
  if (str.length > max) throw new ValidationError(`${field} must be at most ${max} characters.`);
  return str;
}

function optionalInt(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new ValidationError(`${field} must be a whole number from ${min} to ${max}.`);
  return n;
}

/** Turns an unknown request body into a safe WorkEntryInput, or throws ValidationError. */
export function parseEntryInput(body: unknown, defaults: { userName: string; userEmail: string }): WorkEntryInput {
  if (!body || typeof body !== 'object') throw new ValidationError('Request body must be a JSON object.');
  const b = body as Record<string, unknown>;

  const workDate = normalizeDate(b.workDate);
  if (!workDate) throw new ValidationError('workDate must be a date like 2026-11-26.');

  const hoursSpent = Number(b.hoursSpent);
  if (!Number.isFinite(hoursSpent) || hoursSpent < 0 || hoursSpent > 24) {
    throw new ValidationError('hoursSpent must be a number from 0 to 24.');
  }

  const statusRaw = String(b.status || 'IN_PROGRESS').toUpperCase().replace(/\s+/g, '_');
  const status = (WORK_STATUSES as string[]).includes(statusRaw) ? (statusRaw as WorkStatus) : null;
  if (!status) throw new ValidationError(`status must be one of ${WORK_STATUSES.join(', ')}.`);

  const priorityRaw = String(b.priority || 'MEDIUM').toUpperCase();
  const priority = (WORK_PRIORITIES as string[]).includes(priorityRaw) ? (priorityRaw as WorkPriority) : null;
  if (!priority) throw new ValidationError(`priority must be one of ${WORK_PRIORITIES.join(', ')}.`);

  const cat = b.simulationCategory ? String(b.simulationCategory).toUpperCase() : '';
  if (cat && cat !== 'WORKED' && cat !== 'TESTED') throw new ValidationError('simulationCategory must be WORKED or TESTED.');

  const remarks = text(b.remarks, 'remarks', LIMITS.remarks);

  return {
    userName: text(b.userName, 'userName', LIMITS.userName) || defaults.userName,
    userEmail: text(b.userEmail, 'userEmail', LIMITS.userEmail) || defaults.userEmail,
    workDate,
    projectName: text(b.projectName, 'projectName', LIMITS.projectName, true),
    taskDescription: text(b.taskDescription, 'taskDescription', LIMITS.taskDescription, true),
    hoursSpent: Math.round(hoursSpent * 100) / 100,
    status,
    priority,
    remarks: remarks || undefined,
    simulationCategory: (cat || undefined) as WorkEntryInput['simulationCategory'],
    simulationWorkedNumber: optionalInt(b.simulationWorkedNumber, 'simulationWorkedNumber', 1, 99),
    simulationTestedNumber: optionalInt(b.simulationTestedNumber, 'simulationTestedNumber', 1, 99),
    isCarriedForward: b.isCarriedForward === true || b.isCarriedForward === 'true'
  };
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function parseId(id: unknown): string {
  const s = String(id || '');
  if (!ID_PATTERN.test(s)) throw new ValidationError('Invalid entry id.');
  return s;
}

/** For imports: keeps an existing id/createdAt when valid, otherwise makes new ones. */
export function parseImportedEntry(raw: unknown, defaults: { userName: string; userEmail: string }): WorkEntry {
  const input = parseEntryInput(raw, defaults);
  const r = (raw || {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const id = typeof r.id === 'string' && ID_PATTERN.test(r.id) ? r.id : crypto.randomUUID();
  const createdAt = typeof r.createdAt === 'string' && !isNaN(Date.parse(r.createdAt)) ? new Date(r.createdAt).toISOString() : now;
  const updatedAt = typeof r.updatedAt === 'string' && !isNaN(Date.parse(r.updatedAt)) ? new Date(r.updatedAt).toISOString() : now;
  return { ...input, id, createdAt, updatedAt };
}
