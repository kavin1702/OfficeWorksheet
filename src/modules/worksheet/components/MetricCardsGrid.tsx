'use client';

import React from 'react';
import { WorksheetMetrics } from '@/shared/types';
import { Clock, CheckCircle2, PlayCircle, AlertTriangle, Layers, TestTube2, TrendingUp, Sparkles } from 'lucide-react';

interface MetricCardsGridProps {
  metrics: WorksheetMetrics;
}

export const MetricCardsGrid: React.FC<MetricCardsGridProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Total Hours */}
      <div className="p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/70 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-sm">
        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Total Hours</span>
          <Clock className="w-4 h-4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalHours}</span>
          <span className="text-xs font-semibold text-slate-500">hrs</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Across {metrics.totalEntries} logs</div>
      </div>

      {/* 2. Completed */}
      <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 shadow-sm">
        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.completedTasks}</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">({metrics.completionRate}%)</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Finished tasks</div>
      </div>

      {/* 3. In Progress */}
      <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-sm">
        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
          <PlayCircle className="w-4 h-4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.inProgressTasks}</span>
          <span className="text-xs font-semibold text-slate-500">active</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Under development</div>
      </div>

      {/* 4. Carried / Blocked */}
      <div className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/70 to-white dark:from-rose-950/20 dark:to-slate-900 shadow-sm">
        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Carried/Hold</span>
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.carriedForwardTasks + metrics.onHoldTasks + metrics.blockedTasks}
          </span>
          <span className="text-xs font-semibold text-rose-500">pending</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Carried forward</div>
      </div>

      {/* 5. Simulations Worked */}
      <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-950/20 dark:to-slate-900 shadow-sm">
        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Sims Worked</span>
          <Layers className="w-4 h-4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.workedSimulationCount}</span>
          <span className="text-xs font-semibold text-slate-500">/ 12</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Master Simulations</div>
      </div>

      {/* 6. Simulations Tested */}
      <div className="p-4 rounded-2xl border border-teal-200/80 dark:border-teal-900/40 bg-gradient-to-br from-teal-50/70 to-white dark:from-teal-950/20 dark:to-slate-900 shadow-sm">
        <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Sims Tested</span>
          <TestTube2 className="w-4 h-4" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.testedSimulationCount}</span>
          <span className="text-xs font-semibold text-slate-500">/ 7</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">QA Validations</div>
      </div>
    </div>
  );
};
