'use client';

import React, { useState } from 'react';
import { WorkEntry } from '@/shared/types';
import { SimulationService } from '../simulation.service';
import { formatDateDisplay, formatHours } from '@/shared/utils/formatting';
import { Layers, CheckCircle2, Clock, PlayCircle, AlertCircle, PlusCircle, ArrowUpRight, BarChart3, Filter } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

interface SimulationMatrixViewProps {
  entries: WorkEntry[];
  onAddNewWithSimulation?: (simTitle: string, category: 'WORKED' | 'TESTED', simNumber: number) => void;
  onFilterBySimulation?: (simTitle: string) => void;
}

export const SimulationMatrixView: React.FC<SimulationMatrixViewProps> = ({
  entries,
  onAddNewWithSimulation,
  onFilterBySimulation
}) => {
  const [activeTab, setActiveTab] = useState<'WORKED' | 'TESTED'>('WORKED');
  const [searchFilter, setSearchFilter] = useState('');

  const stats = SimulationService.calculateMatrix(entries);
  const currentList = activeTab === 'WORKED' ? stats.workedMatrix : stats.testedMatrix;

  const filteredList = currentList.filter(item =>
    item.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Worked Simulations
            </span>
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">12</span>
            <span className="text-xs font-semibold text-slate-500">Master Simulations</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Total Logged: <b>{stats.totalWorkedHours} hrs</b></span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{stats.workedCompletionRate}% complete</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${stats.workedCompletionRate}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Tested Simulations
            </span>
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">7</span>
            <span className="text-xs font-semibold text-slate-500">Master Simulations</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Total Logged: <b>{stats.totalTestedHours} hrs</b></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.testedCompletionRate}% complete</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${stats.testedCompletionRate}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-950/30 dark:to-slate-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Combined Matrix
            </span>
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
              <BarChart3 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">19</span>
            <span className="text-xs font-semibold text-slate-500">Total Simulation Tracks</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Total Work: <b>{(stats.totalWorkedHours + stats.totalTestedHours).toFixed(1)} hrs</b></span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">100% Tracking</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: `100%` }} />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/30 dark:to-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Matrix Coverage Tip
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Tag any work log with simulation numbers to automatically update progress bars and export sheets.
            </p>
          </div>
          <div className="mt-2">
            <span className="inline-flex items-center text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md">
              âš¡ Excel Export Supported
            </span>
          </div>
        </div>
      </div>

      {/* Matrix Controls & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('WORKED')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'WORKED'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Simulations Worked On (12)</span>
          </button>
          <button
            onClick={() => setActiveTab('TESTED')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'TESTED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Simulations Tested (7)</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search simulation title..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Grid of Simulation Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((sim) => {
          const hasEntries = sim.entriesCount > 0;
          return (
            <div
              key={sim.number}
              className={`p-5 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between ${
                hasEntries
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700'
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        activeTab === 'WORKED'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      #{sim.number}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {activeTab === 'WORKED' ? 'Worked Simulation' : 'Tested Simulation'}
                    </span>
                  </div>

                  {sim.isCompleted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  ) : hasEntries ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                      Not Logged
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3 leading-snug">
                  {sim.title}
                </h3>

                <div className="mt-4 grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Hours</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {sim.totalHours > 0 ? `${sim.totalHours}h` : '0h'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Logs</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">{sim.entriesCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Last Date</div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {sim.lastWorkedDate ? formatDateDisplay(sim.lastWorkedDate) : 'â€”'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {onFilterBySimulation && (
                  <button
                    onClick={() => onFilterBySimulation(sim.title)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>View Logs ({sim.entriesCount})</span>
                  </button>
                )}

                {onAddNewWithSimulation && (
                  <button
                    onClick={() => onAddNewWithSimulation(sim.title, activeTab, sim.number)}
                    className="ml-auto text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Log Work</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
