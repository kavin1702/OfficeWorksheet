'use client';

import React, { useState, useEffect } from 'react';
import { User, WorkEntry } from '@/shared/types';
import { AuthService } from '@/modules/auth/auth.service';
import { WorksheetService } from '@/modules/worksheet/worksheet.service';
import { AdminDashboardView } from '@/modules/admin/components/AdminDashboardView';
import { ArrowLeft, ShieldCheck, Layers } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User>(AuthService.getCurrentUser());
  const [entries, setEntries] = useState<WorkEntry[]>([]);

  useEffect(() => {
    setEntries(WorksheetService.getAllEntries());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">Admin Management</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Superuser
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminDashboardView entries={entries} currentUser={currentUser} />
      </main>
    </div>
  );
}
