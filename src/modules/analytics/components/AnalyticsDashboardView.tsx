'use client';

import React from 'react';
import { WorkEntry } from '@/shared/types';
import { SimulationService } from '@/modules/simulations/simulation.service';
import { PieChart, BarChart3, TrendingUp, CheckCircle, Clock, Layers } from 'lucide-react';

interface AnalyticsDashboardViewProps {
  entries: WorkEntry[];
}

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({ entries }) => {
  const stats = SimulationService.calculateMatrix(entries);

  // Status breakdown
  const statusCounts = {
    COMPLETED: entries.filter(e => e.status === 'COMPLETED').length,
    IN_PROGRESS: entries.filter(e => e.status === 'IN_PROGRESS').length,
    ON_HOLD: entries.filter(e => e.status === 'ON_HOLD').length,
    BLOCKED: entries.filter(e => e.status === 'BLOCKED').length
  };

  const totalLogs = entries.length || 1;

  // Project Hours Aggregation
  const projectMap = new Map<string, number>();
  entries.forEach(e => {
    projectMap.set(e.projectName, (projectMap.get(e.projectName) || 0) + e.hoursSpent);
  });

  const topProjects = Array.from(projectMap.entries())
    .map(([name, hours]) => ({ name, hours: parseFloat(hours.toFixed(1)) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 7);

  const maxProjectHours = topProjects[0]?.hours || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Task Status Breakdown</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">{entries.length} Total Logs</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                </span>
                <span>{statusCounts.COMPLETED} ({Math.round((statusCounts.COMPLETED / totalLogs) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(statusCounts.COMPLETED / totalLogs) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress
                </span>
                <span>{statusCounts.IN_PROGRESS} ({Math.round((statusCounts.IN_PROGRESS / totalLogs) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(statusCounts.IN_PROGRESS / totalLogs) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> On Hold
                </span>
                <span>{statusCounts.ON_HOLD} ({Math.round((statusCounts.ON_HOLD / totalLogs) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(statusCounts.ON_HOLD / totalLogs) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Blocked
                </span>
                <span>{statusCounts.BLOCKED} ({Math.round((statusCounts.BLOCKED / totalLogs) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(statusCounts.BLOCKED / totalLogs) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top Projects by Hours */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Simulations by Hours</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">Top 7 Allocations</span>
          </div>

          <div className="space-y-3 pt-2">
            {topProjects.map((p) => {
              const pct = Math.round((p.hours / maxProjectHours) * 100);
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="truncate max-w-[240px]">{p.name}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{p.hours}h</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
