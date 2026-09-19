'use client';

import React from 'react';
import { User, WorkEntry } from '@/shared/types';
import { PRESET_USERS } from '@/modules/auth/auth.service';
import { ShieldCheck, Users, Database, Layers, CheckCircle2 } from 'lucide-react';

interface AdminDashboardViewProps {
  entries: WorkEntry[];
  currentUser: User;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ entries, currentUser }) => {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Admin Control Center</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Logged in as Administrator ({currentUser.email})
            </p>
          </div>
        </div>
      </div>

      {/* Team Member Roster */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Team Member Directory</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_USERS.map((user) => {
            const userLogs = entries.filter(e => e.userEmail.toLowerCase() === user.email.toLowerCase());
            const userHours = userLogs.reduce((acc, curr) => acc + curr.hoursSpent, 0);

            return (
              <div
                key={user.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</div>
                    <div className="text-[11px] text-slate-500">{user.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900 dark:text-white">{userHours} hrs</div>
                  <div className="text-[10px] text-slate-400">{userLogs.length} logs</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
