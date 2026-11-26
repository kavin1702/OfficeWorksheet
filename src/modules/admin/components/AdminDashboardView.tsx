'use client';

import React, { useMemo } from 'react';
import { User, WorkEntry } from '@/shared/types';
import { getUserColor } from '@/shared/utils/formatting';
import { ShieldCheck, Users } from 'lucide-react';

interface AdminDashboardViewProps {
  entries: WorkEntry[];
  currentUser: User;
}

interface PersonSummary {
  email: string;
  name: string;
  hours: number;
  logs: number;
  completed: number;
  lastDate: string;
}

/** Groups every work log by person (email) so you can see who did what. */
export function summarizeByPerson(entries: WorkEntry[]): PersonSummary[] {
  const map = new Map<string, PersonSummary>();
  entries.forEach((e) => {
    const key = (e.userEmail || 'unknown').toLowerCase();
    const p = map.get(key) || { email: key, name: e.userName || key, hours: 0, logs: 0, completed: 0, lastDate: '' };
    p.hours += Number(e.hoursSpent) || 0;
    p.logs += 1;
    if (e.status === 'COMPLETED') p.completed += 1;
    if (e.workDate > p.lastDate) p.lastDate = e.workDate;
    map.set(key, p);
  });
  return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ entries, currentUser }) => {
  const people = useMemo(() => summarizeByPerson(entries), [entries]);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Team overview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as {currentUser.name}</p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">People in the worksheet ({people.length})</h3>
        </div>

        {people.length === 0 ? (
          <p className="text-xs text-slate-500">No work logs yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {people.map((p) => (
              <div key={p.email} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: getUserColor(p.name) }}
                    aria-hidden="true"
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{p.email}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white">{Math.round(p.hours * 10) / 10} hrs</div>
                  <div className="text-[10px] text-slate-400">
                    {p.logs} logs · {p.completed} done
                  </div>
                  {p.lastDate && <div className="text-[10px] text-slate-400">last {p.lastDate}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
