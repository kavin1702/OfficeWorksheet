'use client';

import React, { useState, useEffect } from 'react';
import { WorkEntry, FilterState, ViewMode, User } from '@/shared/types';
import { AuthService } from '@/modules/auth/auth.service';
import { WorksheetService, INITIAL_SAMPLE_ENTRIES } from '@/modules/worksheet/worksheet.service';
import { MetricCardsGrid } from '@/modules/worksheet/components/MetricCardsGrid';
import { WorksheetFilterPanel } from '@/modules/worksheet/components/WorksheetFilterPanel';
import { WorksheetTableView } from '@/modules/worksheet/components/WorksheetTableView';
import { SimulationMatrixView } from '@/modules/simulations/components/SimulationMatrixView';
import { CalendarMonthView } from '@/modules/calendar/components/CalendarMonthView';
import { DayInspector } from '@/modules/calendar/components/DayInspector';
import { AnalyticsDashboardView } from '@/modules/analytics/components/AnalyticsDashboardView';
import { WorkEntryModal } from '@/modules/worksheet/components/WorkEntryModal';
import { AuthPortalModal } from '@/modules/auth/components/AuthPortalModal';
import { UserProfileDropdown } from '@/modules/auth/components/UserProfileDropdown';
import { DailyReportModal } from '@/modules/reporting/components/DailyReportModal';
import { CloudSyncModal } from '@/modules/cloud-sync/components/CloudSyncModal';
import { ImportExportModal } from '@/modules/import-export/components/ImportExportModal';
import { useToast } from '@/shared/components/ui/ToastProvider';
import { useTheme } from '@/shared/components/ui/ThemeProvider';
import { getTodayString } from '@/shared/utils/date';
import {
  Layers,
  FileSpreadsheet,
  Cloud,
  FileText,
  Moon,
  Sun,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User>(AuthService.getCurrentUser());
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getTodayString());

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    status: 'ALL',
    priority: 'ALL',
    simulationCategory: 'ALL',
    datePreset: 'ALL',
    userEmail: 'ALL'
  });

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Simulation quick-log prefill
  const [simPrefill, setSimPrefill] = useState<{
    title?: string;
    category?: 'WORKED' | 'TESTED';
    number?: number;
  }>({});

  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  // Load entries on mount & listen to updates
  useEffect(() => {
    const loaded = WorksheetService.getAllEntries();
    setEntries(loaded);
    setIsLoading(false);

    const handleEntriesUpdate = (e: any) => {
      if (e.detail) setEntries(e.detail);
    };

    const handleAuthUpdate = (e: any) => {
      if (e.detail) setCurrentUser(e.detail);
    };

    window.addEventListener('workpulse:entries-updated', handleEntriesUpdate);
    window.addEventListener('workpulse:auth-change', handleAuthUpdate);

    return () => {
      window.removeEventListener('workpulse:entries-updated', handleEntriesUpdate);
      window.removeEventListener('workpulse:auth-change', handleAuthUpdate);
    };
  }, []);

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const handleSaveEntry = (
    entryData: Omit<WorkEntry, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => {
    if (id) {
      WorksheetService.updateEntry(id, entryData);
    } else {
      WorksheetService.addEntry(entryData);
    }
    setEntries(WorksheetService.getAllEntries());
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this work log entry?')) {
      WorksheetService.deleteEntry(id);
      setEntries(WorksheetService.getAllEntries());
      addToast({
        title: 'Entry Deleted',
        message: 'The work log has been removed.',
        type: 'info'
      });
    }
  };

  const handleDuplicateEntry = (entry: WorkEntry) => {
    WorksheetService.addEntry({
      userEmail: currentUser.email,
      userName: currentUser.name,
      workDate: getTodayString(),
      projectName: `${entry.projectName}`,
      taskDescription: entry.taskDescription,
      hoursSpent: entry.hoursSpent,
      status: 'IN_PROGRESS',
      priority: entry.priority,
      remarks: entry.remarks ? `Copy: ${entry.remarks}` : undefined,
      simulationCategory: entry.simulationCategory,
      simulationWorkedNumber: entry.simulationWorkedNumber,
      simulationTestedNumber: entry.simulationTestedNumber,
      isCarriedForward: false
    });
    setEntries(WorksheetService.getAllEntries());
    addToast({
      title: 'Log Duplicated',
      message: `Created a copy of ${entry.projectName} for today.`,
      type: 'success'
    });
  };

  const handleCarryForward = (entry: WorkEntry) => {
    WorksheetService.addEntry({
      userEmail: currentUser.email,
      userName: currentUser.name,
      workDate: getTodayString(),
      projectName: entry.projectName,
      taskDescription: `[Carried Forward] ${entry.taskDescription}`,
      hoursSpent: entry.hoursSpent,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      remarks: `Carried forward from ${entry.workDate}`,
      simulationCategory: entry.simulationCategory,
      simulationWorkedNumber: entry.simulationWorkedNumber,
      simulationTestedNumber: entry.simulationTestedNumber,
      isCarriedForward: true
    });
    setEntries(WorksheetService.getAllEntries());
    addToast({
      title: 'Task Carried Forward',
      message: `Carried forward to today's active workbench!`,
      type: 'success'
    });
  };

  const handleOpenAddWithSimulation = (
    simTitle: string,
    category: 'WORKED' | 'TESTED',
    simNumber: number
  ) => {
    setSimPrefill({ title: simTitle, category, number: simNumber });
    setEditingEntry(null);
    setIsEntryModalOpen(true);
  };

  const filteredEntries = WorksheetService.filterEntries(entries, filters);
  const metrics = WorksheetService.calculateMetrics(entries);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  WorkPulse
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  v2.0 Modular
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Office Daily Worksheet & Simulation Hub
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Daily Report */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 shadow-sm"
              title="Generate Daily Standup Report"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="hidden md:inline">Daily Report</span>
            </button>

            {/* Cloud Sync */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 shadow-sm"
              title="Google Sheets Sync"
            >
              <Cloud className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline">Cloud Sync</span>
            </button>

            {/* Import / Export */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 shadow-sm"
              title="Import & Export"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline">Export</span>
            </button>

            {/* Admin Link if admin */}
            {currentUser.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
              title="Toggle Light / Dark Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile */}
            <UserProfileDropdown
              user={currentUser}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onUserChanged={(u) => setCurrentUser(u)}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Metric Cards Grid */}
        <MetricCardsGrid metrics={metrics} />

        {/* Filter Panel */}
        <WorksheetFilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m)}
          onAddNewClick={() => {
            setSimPrefill({});
            setEditingEntry(null);
            setIsEntryModalOpen(true);
          }}
          onSyncClick={() => setIsSyncModalOpen(true)}
          totalCount={filteredEntries.length}
        />

        {/* Dynamic View Component */}
        {viewMode === 'TABLE' && (
          <WorksheetTableView
            entries={filteredEntries}
            onEdit={(entry) => {
              setEditingEntry(entry);
              setIsEntryModalOpen(true);
            }}
            onDelete={handleDeleteEntry}
            onDuplicate={handleDuplicateEntry}
            onCarryForward={handleCarryForward}
          />
        )}

        {viewMode === 'MATRIX' && (
          <SimulationMatrixView
            entries={entries}
            onAddNewWithSimulation={handleOpenAddWithSimulation}
            onFilterBySimulation={(title) => {
              setFilters(prev => ({ ...prev, searchQuery: title }));
              setViewMode('TABLE');
            }}
          />
        )}

        {viewMode === 'CALENDAR' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CalendarMonthView
                entries={entries}
                selectedDate={selectedCalendarDate}
                onSelectDate={(d) => setSelectedCalendarDate(d)}
                onAddNewForDate={(d) => {
                  setSimPrefill({});
                  setEditingEntry(null);
                  setIsEntryModalOpen(true);
                }}
              />
            </div>
            <div>
              <DayInspector
                selectedDate={selectedCalendarDate}
                entries={entries}
                onAddNewForDate={(d) => {
                  setSimPrefill({});
                  setEditingEntry(null);
                  setIsEntryModalOpen(true);
                }}
                onEdit={(entry) => {
                  setEditingEntry(entry);
                  setIsEntryModalOpen(true);
                }}
                onDelete={handleDeleteEntry}
              />
            </div>
          </div>
        )}

        {viewMode === 'ANALYTICS' && (
          <AnalyticsDashboardView entries={entries} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 bg-white dark:bg-slate-900/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            WorkPulse Modular Monolith â€¢ Next.js 14, Tailwind CSS, Neon DB, Prisma
          </div>
          <div className="flex items-center space-x-4 font-medium">
            <span>12 Master Worked + 7 Master Tested Matrices</span>
            <span>â€¢</span>
            <span>All Data Autosaved</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <WorkEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        currentUser={currentUser}
        initialSimulationTitle={simPrefill.title}
        initialCategory={simPrefill.category}
        initialSimNumber={simPrefill.number}
      />

      <AuthPortalModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onUserChanged={(u) => setCurrentUser(u)}
        currentUser={currentUser}
      />

      <DailyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        entries={entries}
        currentUser={currentUser}
      />

      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        entries={entries}
      />

      <ImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entries={entries}
        onDataImported={(newEntries) => setEntries(newEntries)}
      />
    </div>
  );
}
