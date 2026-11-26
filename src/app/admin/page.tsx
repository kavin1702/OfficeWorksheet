'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { User } from '@/shared/types';
import { useSession } from '@/modules/auth/useSession';
import { useWorkEntries } from '@/modules/worksheet/useWorkEntries';
import { AdminDashboardView } from '@/modules/admin/components/AdminDashboardView';

export default function AdminPage() {
  const { session } = useSession();
  const mode = session ? (session.storage === 'sheets' ? 'sheets' : 'local') : null;
  const { entries, isLoading, loadError } = useWorkEntries(mode);

  const currentUser: User = useMemo(
    () => ({
      id: 'current-user',
      email: session?.user?.email || 'user@workpulse.local',
      name: session?.user?.name || 'WorkPulse User',
      role: 'ADMIN',
      createdAt: '',
      updatedAt: ''
    }),
    [session]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center space-x-4">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-base font-bold text-slate-900 dark:text-white">Team overview</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loadError && <p className="mb-4 text-sm text-rose-600">Could not load work logs: {loadError}</p>}
        {isLoading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <AdminDashboardView entries={entries} currentUser={currentUser} />
        )}
      </main>
    </div>
  );
}
