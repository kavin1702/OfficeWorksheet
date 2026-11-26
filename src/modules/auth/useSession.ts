'use client';
import { useCallback, useEffect, useState } from 'react';

export type StorageMode = 'sheets' | 'local' | 'misconfigured';

export interface SessionInfo {
  authRequired: boolean;
  authenticated: boolean;
  storage: StorageMode;
  storageProblem: string | null;
  user: { name: string; email: string } | null;
}

/** Asks the server who is signed in and where data is stored. */
export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/session', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSession(await res.json());
      setError(null);
    } catch (e) {
      // Server unreachable: keep working on this device only.
      setError((e as Error).message);
      setSession({ authRequired: false, authenticated: true, storage: 'local', storageProblem: null, user: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { session, error, reload: load };
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  window.location.href = '/login';
}
