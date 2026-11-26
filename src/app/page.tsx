'use client';

import React, { useMemo, useState } from 'react';
import { WorkEntry, WorkEntryInput, FilterState, ViewMode, User } from '@/shared/types';
import { WorksheetService } from '@/modules/worksheet/worksheet.service';
import { useWorkEntries } from '@/modules/worksheet/useWorkEntries';
import { useSession, logout } from '@/modules/auth/useSession';
import { MetricCardsGrid } from '@/modules/worksheet/components/MetricCardsGrid';
import { WorksheetFilterPanel } from '@/modules/worksheet/components/WorksheetFilterPanel';
import { WorksheetTableView } from '@/modules/worksheet/components/WorksheetTableView';
import { SimulationMatrixView } from '@/modules/simulations/components/SimulationMatrixView';
import { CalendarMonthView } from '@/modules/calendar/components/CalendarMonthView';
import { DayInspector } from '@/modules/calendar/components/DayInspector';
import { AnalyticsDashboardView } from '@/modules/analytics/components/AnalyticsDashboardView';
import { WorkEntryModal } from '@/modules/worksheet/components/WorkEntryModal';
import { DailyReportModal } from '@/modules/reporting/components/DailyReportModal';
import { CloudSyncModal } from '@/modules/cloud-sync/components/CloudSyncModal';
import { ImportExportModal } from '@/modules/import-export/components/ImportExportModal';
import { StorageBanner } from '@/modules/cloud-sync/components/StorageBanner';
import { useToast } from '@/shared/components/ui/ToastProvider';
import { useTheme } from '@/shared/components/ui/ThemeProvider';
import { getTodayString } from '@/shared/utils/date';
import { Layers, FileSpreadsheet, Cloud, FileText, Moon, Sun, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const headerButton =
  'p-2 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 shadow-sm';

export default function DashboardPage() {
  const { session } = useSession();
  const storageMode = session ? (session.storage === 'sheets' ? 'sheets' : 'local') : null;
  const { entries, isLoading, loadError, reload, addEntry, updateEntry, deleteEntry, importEntries } =
    useWorkEntries(storageMode);

  const currentUser: User = useMemo(
    () => ({
      id: 'current-user',
      email: session?.user?.email || 'user@workpulse.local',
      name: session?.user?.name || 'WorkPulse User',
      role: 'ADMIN',
      createdAt: '',
      updatedAt: ''
    }),
    [session]
  );

  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getTodayString());
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    status: 'ALL',
    priority: 'ALL',
    simulationCategory: 'ALL',
    datePreset: 'ALL',
    userEmail: 'ALL'
  });

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{
    title?: string;
    category?: 'WORKED' | 'TESTED';
    number?: number;
    date?: string;
  }>({});

  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const openNewEntry = (p: typeof prefill = {}) => {
    setPrefill(p);
    setEditingEntry(null);
    setIsEntryModalOpen(true);
  };

  const fail = (title: string, err: unknown) =>
    addToast({ title, message: (err as Error).message || 'Something went wrong.', type: 'error' });

  const handleSaveEntry = async (input: WorkEntryInput, id?: string) => {
    if (id) await updateEntry(id, input);
    else await addEntry(input);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Delete this work log entry? This cannot be undone.')) return;
    try {
      await deleteEntry(id);
      addToast({ title: 'Entry deleted', message: 'The work log has been removed.', type: 'info' });
    } catch (err) {
      fail('Delete failed', err);
    }
  };

  const copyFrom = (entry: WorkEntry): WorkEntryInput => ({
    userEmail: currentUser.email,
    userName: currentUser.name,
    workDate: getTodayString(),
    projectName: entry.projectName,
    taskDescription: entry.taskDescription,
    hoursSpent: entry.hoursSpent,
    status: 'IN_PROGRESS',
    priority: entry.priority,
    remarks: entry.remarks,
    simulationCategory: entry.simulationCategory,
    simulationWorkedNumber: entry.simulationWorkedNumber,
    simulationTestedNumber: entry.simulationTestedNumber,
    isCarriedForward: false
  });

  const handleDuplicateEntry = async (entry: WorkEntry) => {
    try {
      await addEntry({ ...copyFrom(entry), remarks: entry.remarks ? `Copy: ${entry.remarks}` : undefined });
      addToast({ title: 'Log duplicated', message: `Created a copy of ${entry.projectName} for today.`, type: 'success' });
    } catch (err) {
      fail('Duplicate failed', err);
    }
  };

  const handleCarryForward = async (entry: WorkEntry) => {
    try {
      await addEntry({
        ...copyFrom(entry),
        taskDescription: entry.taskDescription.startsWith('[Carried Forward]')
          ? entry.taskDescription
          : `[Carried Forward] ${entry.taskDescription}`,
        priority: 'HIGH',
        remarks: `Carried forward from ${entry.workDate}`,
        isCarriedForward: true
      });
      addToast({ title: 'Task carried forward', message: 'Added to today as In Progress.', type: 'success' });
    } catch (err) {
      fail('Carry forward failed', err);
    }
  };

  const filteredEntries = useMemo(() => WorksheetService.filterEntries(entries, filters), [entries, filters]);
  const metrics = useMemo(() => WorksheetService.calculateMetrics(entries), [entries]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 hidden min-[460px]:block">
              <div className="flex items-center space-x-2">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">WorkPulse</span>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Simulation Hub
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                12 Worked + 7 Tested simulation tracking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button onClick={() => setIsReportModalOpen(true)} className={headerButton} title="Daily standup report">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="hidden md:inline">Daily Report</span>
            </button>
            <button onClick={() => setIsSyncModalOpen(true)} className={headerButton} title="Google Sheets storage">
              <Cloud className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline">Google Sheets</span>
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className={headerButton} title="Import and export">
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline">Import / Export</span>
            </button>
            <Link href="/admin" className={headerButton} title="Team overview">
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span className="hidden lg:inline">Team</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
              title="Toggle light / dark theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 text-xs font-bold text-blue-700 dark:text-blue-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="max-w-[120px] truncate">{currentUser.name}</span>
            </div>
            {session?.authRequired && (
              <button onClick={logout} className={headerButton} title="Sign out" aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <StorageBanner session={session} onOpenSettings={() => setIsSyncModalOpen(true)} />

        {loadError && (
          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-sm text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              <strong>Could not load your work logs:</strong> {loadError}
            </span>
            <button
              onClick={reload}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 shrink-0"
            >
              Try again
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3" role="status">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm font-medium">
              {storageMode === 'sheets' ? 'Loading your work logs from Google Sheets…' : 'Loading…'}
            </span>
          </div>
        ) : (
          <>
            <MetricCardsGrid metrics={metrics} />

            <WorksheetFilterPanel
              filters={filters}
              onFilterChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onAddNewClick={() => openNewEntry()}
              onSyncClick={() => setIsSyncModalOpen(true)}
              totalCount={filteredEntries.length}
            />

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
                onAddNewWithSimulation={(title, category, number) => openNewEntry({ title, category, number })}
                onFilterBySimulation={(title) => {
                  setFilters((prev) => ({ ...prev, searchQuery: title }));
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
                    onSelectDate={setSelectedCalendarDate}
                    onAddNewForDate={(date) => openNewEntry({ date })}
                  />
                </div>
                <div>
                  <DayInspector
                    selectedDate={selectedCalendarDate}
                    entries={entries}
                    onAddNewForDate={(date) => openNewEntry({ date })}
                    onEdit={(entry) => {
                      setEditingEntry(entry);
                      setIsEntryModalOpen(true);
                    }}
                    onDelete={handleDeleteEntry}
                  />
                </div>
              </div>
            )}

            {viewMode === 'ANALYTICS' && <AnalyticsDashboardView entries={entries} />}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 bg-white dark:bg-slate-900/60 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div>WorkPulse • Daily worksheet and simulation tracker</div>
          <div className="font-medium">
            {storageMode === 'sheets' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Saved to Google Sheets</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-bold">● Saved on this device only</span>
            )}
          </div>
        </div>
      </footer>

      <WorkEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        currentUser={currentUser}
        initialSimulationTitle={prefill.title}
        initialCategory={prefill.category}
        initialSimNumber={prefill.number}
        initialDate={prefill.date}
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
        session={session}
        onUploaded={reload}
      />

      <ImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entries={entries}
        storageMode={storageMode}
        onImport={importEntries}
      />
    </div>
  );
}
