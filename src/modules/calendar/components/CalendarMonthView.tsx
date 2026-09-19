'use client';

import React, { useState } from 'react';
import { WorkEntry, CalendarDayData } from '@/shared/types';
import { CalendarService } from '../calendar.service';
import { getTodayString } from '@/shared/utils/date';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

interface CalendarMonthViewProps {
  entries: WorkEntry[];
  onSelectDate: (date: string) => void;
  onAddNewForDate: (date: string) => void;
  selectedDate: string;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  entries,
  onSelectDate,
  onAddNewForDate,
  selectedDate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysGrid = CalendarService.getMonthGrid(year, month, entries);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayStr = getTodayString();

  return (
    <div className="space-y-4">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <CalIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive Month Inspector & Activity Heatmap
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysGrid.map((day) => {
          const isToday = day.date === todayStr;
          const isSelected = day.date === selectedDate;
          const hasEntries = day.entries.length > 0;

          return (
            <div
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className={`min-h-[100px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
                  : isToday
                  ? 'border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 shadow-sm'
                  : hasEntries
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  : 'border-slate-100 dark:border-slate-850 bg-slate-50/40 dark:bg-slate-900/20 hover:bg-slate-100/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : isSelected
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {day.totalHours > 0 && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md">
                    {day.totalHours}h
                  </span>
                )}
              </div>

              {/* Day tasks preview */}
              <div className="space-y-1 my-1">
                {day.entries.slice(0, 2).map((entry) => (
                  <div
                    key={entry.id}
                    className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded"
                  >
                    {entry.projectName}
                  </div>
                ))}
                {day.entries.length > 2 && (
                  <div className="text-[9px] font-bold text-slate-400 pl-1">
                    +{day.entries.length - 2} more
                  </div>
                )}
              </div>

              {/* Quick Add Button on Hover */}
              <div className="pt-1 flex items-center justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNewForDate(day.date);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-opacity"
                  title="Add work log for this day"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
