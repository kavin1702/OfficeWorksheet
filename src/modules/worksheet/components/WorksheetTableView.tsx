'use client';

import React from 'react';
import { WorkEntry } from '@/shared/types';
import { formatDateDisplay, getStatusBadgeClass, getPriorityBadgeClass, getStatusIcon, getPriorityIcon } from '@/shared/utils/formatting';
import { Edit3, Trash2, Copy, ArrowRightCircle, Sparkles, Layers, CheckCircle2 } from 'lucide-react';

interface WorksheetTableViewProps {
  entries: WorkEntry[];
  onEdit: (entry: WorkEntry) => void;
  onDelete: (id: string) => void;
  onDuplicate: (entry: WorkEntry) => void;
  onCarryForward: (entry: WorkEntry) => void;
}

export const WorksheetTableView: React.FC<WorksheetTableViewProps> = ({
  entries,
  onEdit,
  onDelete,
  onDuplicate,
  onCarryForward
}) => {
  if (entries.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto text-blue-500">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white mt-3">No work logs found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          No tasks match the active filters or date preset. Adjust your filters or click "Add Work Log" to create a new entry.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <th className="py-3.5 px-4">Date</th>
            <th className="py-3.5 px-4">Simulation / Project</th>
            <th className="py-3.5 px-4">Task Completed & Details</th>
            <th className="py-3.5 px-4 text-center">Status</th>
            <th className="py-3.5 px-4 text-center">Priority</th>
            <th className="py-3.5 px-4 text-center">Hours</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {entries.map((entry) => {
            const isWorked = entry.simulationCategory === 'WORKED' || entry.simulationWorkedNumber;
            const isTested = entry.simulationCategory === 'TESTED' || entry.simulationTestedNumber;

            return (
              <tr
                key={entry.id}
                className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors group"
              >
                {/* Date */}
                <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{formatDateDisplay(entry.workDate)}</span>
                    {entry.isCarriedForward && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 mt-0.5">
                        <ArrowRightCircle className="w-2.5 h-2.5" /> Carried
                      </span>
                    )}
                  </div>
                </td>

                {/* Project / Simulation */}
                <td className="py-3 px-4 max-w-xs">
                  <div className="font-bold text-slate-900 dark:text-white leading-snug">
                    {entry.projectName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isWorked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5" /> Worked #{entry.simulationWorkedNumber || 1}
                      </span>
                    )}
                    {isTested && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Tested #{entry.simulationTestedNumber || 1}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 truncate">{entry.userName}</span>
                  </div>
                </td>

                {/* Task Description & Remarks */}
                <td className="py-3 px-4 max-w-md">
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    {entry.taskDescription}
                  </p>
                  {entry.remarks && (
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Note: {entry.remarks}
                    </div>
                  )}
                </td>

                {/* Status */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${getStatusBadgeClass(
                      entry.status
                    )}`}
                  >
                    <span>{getStatusIcon(entry.status)}</span>
                    <span>{entry.status.replace('_', ' ')}</span>
                  </span>
                </td>

                {/* Priority */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${getPriorityBadgeClass(
                      entry.priority
                    )}`}
                  >
                    <span>{getPriorityIcon(entry.priority)}</span>
                    <span>{entry.priority}</span>
                  </span>
                </td>

                {/* Hours Spent */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {entry.hoursSpent}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-0.5">h</span>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-1">
                    <button
                      onClick={() => onEdit(entry)}
                      title="Edit Log"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicate(entry)}
                      title="Duplicate"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {entry.status !== 'COMPLETED' && (
                      <button
                        onClick={() => onCarryForward(entry)}
                        title="Carry Forward to Today"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(entry.id)}
                      title="Delete Log"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
