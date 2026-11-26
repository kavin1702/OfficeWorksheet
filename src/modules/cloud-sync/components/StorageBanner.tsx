'use client';
import React from 'react';
import { CloudOff, AlertTriangle } from 'lucide-react';
import type { SessionInfo } from '@/modules/auth/useSession';

/** Tells the user, at a glance, where their data is being saved. */
export const StorageBanner: React.FC<{ session: SessionInfo | null; onOpenSettings: () => void }> = ({
  session,
  onOpenSettings
}) => {
  if (!session || session.storage === 'sheets') return null;

  const misconfigured = session.storage === 'misconfigured';
  return (
    <div
      className={`p-4 rounded-2xl border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        misconfigured
          ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200'
          : 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {misconfigured ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CloudOff className="w-5 h-5 shrink-0" />}
        <div>
          <p className="font-bold">
            {misconfigured ? 'Google Sheets is set up incorrectly' : 'Local mode: data is saved in this browser only'}
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            {misconfigured
              ? session.storageProblem
              : 'Connect Google Sheets to keep your logs safe and use them on any device.'}
          </p>
        </div>
      </div>
      <button
        onClick={onOpenSettings}
        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shrink-0"
      >
        How to connect
      </button>
    </div>
  );
};
