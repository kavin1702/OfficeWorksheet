'use client';

import React from 'react';
import { WorkEntry } from '@/shared/types';
import { formatDateDisplay, getStatusBadgeClass } from '@/shared/utils/formatting';
import { Plus, Edit3, Trash2, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

interface DayInspectorProps {
  selectedDate: string;
  entries: WorkEntry[];
  onAddNewForDate: (date: string) => void;
  onEdit: (entry: WorkEntry) => void;
  onDelete: (id: string) => void;
}

export const DayInspector: React.FC<DayInspectorProps> = ({
  selectedDate,
  entries,
  onAddNewForDate,
  onEdit,
  onDelete
}) => {
  const dayEntries = entries.filter(e => e.workDate === selectedDate);
  const totalHours = dayEntries.reduce((acc, curr) => acc + curr.hoursSpent, 0);

  return (
    <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {formatDateDisplay(selectedDate)}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {dayEntries.length} tasks logged ({totalHours} hrs total)
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => onAddNewForDate(selectedDate)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Log for Day
        </Button>
      </div>

      {dayEntries.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No activities logged on this date. Click the button above to record your work.
        </div>
      ) : (
        <div className="space-y-2.5">
          {dayEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{entry.projectName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(entry.status)}`}>
                    {entry.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {entry.taskDescription}
                </p>
                <div className="mt-2 flex items-center space-x-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <Clock className="w-3 h-3" /> {entry.hoursSpent} hrs
                  </span>
                  <span>{entry.priority} Priority</span>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => onEdit(entry)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
