'use client';

import React from 'react';
import { FilterState, ViewMode, WorkStatus, WorkPriority } from '@/shared/types';
import { Search, Plus, Calendar, Table, LayoutGrid, BarChart2, Layers, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

interface WorksheetFilterPanelProps {
  filters: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddNewClick: () => void;
  onSyncClick: () => void;
  totalCount: number;
}

export const WorksheetFilterPanel: React.FC<WorksheetFilterPanelProps> = ({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onAddNewClick,
  onSyncClick,
  totalCount
}) => {
  const datePresets = [
    { id: 'ALL', label: 'All Dates' },
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'THIS_MONTH', label: 'This Month' }
  ];

  return (
    <div className="space-y-3">
      {/* Top action row: Search, Quick Dates, Add Log, Sync */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search projects, tasks, simulation keywords..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => onViewModeChange('TABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'TABLE'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>

          <button
            onClick={() => onViewModeChange('MATRIX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'MATRIX'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sim Matrix (12+7)</span>
          </button>

          <button
            onClick={() => onViewModeChange('CALENDAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'CALENDAR'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => onViewModeChange('ANALYTICS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'ANALYTICS'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <Button
            variant="primary"
            onClick={onAddNewClick}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-md shadow-blue-500/20"
          >
            Add Work Log
          </Button>
        </div>
      </div>

      {/* Bottom Filter Row: Date Presets, Status Dropdown, Priority Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        {/* Date presets pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {datePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onFilterChange({ datePreset: preset.id as any })}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                filters.datePreset === preset.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Status & Priority selects */}
        <div className="flex items-center space-x-2">
          <select
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value as any })}
            className="h-8 px-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => onFilterChange({ priority: e.target.value as any })}
            className="h-8 px-2.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <span className="text-xs text-slate-500 font-medium pl-1">
            Showing <b>{totalCount}</b> entries
          </span>
        </div>
      </div>
    </div>
  );
};
