'use client';
import { WorkEntry, WorkEntryInput } from '@/shared/types';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
  } catch {
    throw new ApiError('No connection to the server. Check your internet and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  if (!res.ok || data.success === false) {
    throw new ApiError(data.error || `Request failed (HTTP ${res.status}).`, res.status);
  }
  return data as T;
}

/** Browser-side client for the /api/entries routes (which store rows in Google Sheets). */
export const EntriesApi = {
  list: async () => (await request<{ data: WorkEntry[] }>('/api/entries')).data,
  create: async (input: WorkEntryInput) =>
    (await request<{ data: WorkEntry }>('/api/entries', { method: 'POST', body: JSON.stringify(input) })).data,
  update: async (id: string, input: WorkEntryInput) =>
    (await request<{ data: WorkEntry }>(`/api/entries/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    })).data,
  remove: async (id: string) => {
    await request(`/api/entries/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  importAll: (entries: WorkEntry[], mode: 'append' | 'replace') =>
    request<{ added: number; updated: number; total: number }>('/api/entries/import', {
      method: 'POST',
      body: JSON.stringify({ entries, mode })
    })
};
