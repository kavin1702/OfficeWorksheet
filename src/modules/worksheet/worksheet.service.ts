import { WorkEntry, WorkStatus, WorkPriority, FilterState, WorksheetMetrics } from '@/shared/types';
import { getTodayString, getYesterdayString, isDateInRange, getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth } from '@/shared/utils/date';

const STORAGE_KEY = 'workpulse_work_entries';

export const INITIAL_SAMPLE_ENTRIES: WorkEntry[] = [
  {
    id: 'entry-1',
    userEmail: 'mnkavin2006@gmail.com',
    userName: 'M.N. Kavin',
    workDate: '2026-01-02',
    projectName: 'MDI â€“ Manufacturing / Manual Cleaning of Ethanol',
    taskDescription: 'MDI â€“ Cleaning of Purified Water, ethanol manual cleaning simulation script setup and component hierarchy.',
    hoursSpent: 6.5,
    status: 'COMPLETED',
    priority: 'HIGH',
    remarks: 'Initial framework setup completed and tested.',
    simulationCategory: 'WORKED',
    simulationWorkedNumber: 1,
    isCarriedForward: false,
    createdAt: '2026-01-02T18:30:00.000Z',
    updatedAt: '2026-01-02T18:30:00.000Z'
  },
  {
    id: 'entry-2',
    userEmail: 'mnkavin2006@gmail.com',
    userName: 'M.N. Kavin',
    workDate: '2026-01-03',
    projectName: 'FFS â€“ Cleaning of Parisson Area',
    taskDescription: 'Parisson extrusion station cleaning sequence modeling and vacuum sanitization physics trigger.',
    hoursSpent: 6.0,
    status: 'COMPLETED',
    priority: 'MEDIUM',
    remarks: 'Physics collision boundaries calibrated for parisson nozzle.',
    simulationCategory: 'WORKED',
    simulationWorkedNumber: 2,
    isCarriedForward: false,
    createdAt: '2026-01-03T18:30:00.000Z',
    updatedAt: '2026-01-03T18:30:00.000Z'
  },
  {
    id: 'entry-3',
    userEmail: 'kavin@8chili.com',
    userName: 'Kavin (8chili)',
    workDate: '2026-01-05',
    projectName: 'MDI â€“ Cleaning of Purified Water',
    taskDescription: 'Purified water CIP cycle logic and sampling valve contamination indicators.',
    hoursSpent: 7.0,
    status: 'COMPLETED',
    priority: 'HIGH',
    remarks: 'Water conductivity sensor animation linked.',
    simulationCategory: 'WORKED',
    simulationWorkedNumber: 3,
    isCarriedForward: false,
    createdAt: '2026-01-05T18:30:00.000Z',
    updatedAt: '2026-01-05T18:30:00.000Z'
  },
  {
    id: 'entry-4',
    userEmail: 'mnkavin2006@gmail.com',
    userName: 'M.N. Kavin',
    workDate: '2026-01-06',
    projectName: 'MDI â€“ Setup and Operations',
    taskDescription: 'Canister crimping mechanism and pressure metering chamber assembly steps.',
    hoursSpent: 8.0,
    status: 'COMPLETED',
    priority: 'URGENT',
    remarks: 'Full aerosol spray particle emitter verified.',
    simulationCategory: 'WORKED',
    simulationWorkedNumber: 4,
    isCarriedForward: false,
    createdAt: '2026-01-06T18:30:00.000Z',
    updatedAt: '2026-01-06T18:30:00.000Z'
  },
  {
    id: 'entry-5',
    userEmail: 'mnkavin2006@gmail.com',
    userName: 'M.N. Kavin',
    workDate: '2026-01-07',
    projectName: 'Lupin Ophthalmic (including Jammed / Toppled Bottle)',
    taskDescription: 'Aseptic ophthalmic bottle conveyor jam clearing and toppled vial uprighting sequence.',
    hoursSpent: 8.5,
    status: 'COMPLETED',
    priority: 'URGENT',
    remarks: 'Critical defect handling scenario verified with QA.',
    simulationCategory: 'WORKED',
    simulationWorkedNumber: 5,
    isCarriedForward: false,
    createdAt: '2026-01-07T18:30:00.000Z',
    updatedAt: '2026-01-07T18:30:00.000Z'
  },
  {
    id: 'entry-6',
    userEmail: 'kavin@8chili.com',
    userName: 'Kavin (8chili)',
    workDate: '2026-01-08',
    projectName: 'Lighting in Gowning',
    taskDescription: 'Cleanroom gowning room lux lighting calculation and visual luxmeter HUD.',
    hoursSpent: 4.5,
    status: 'COMPLETED',
    priority: 'LOW',
    remarks: 'Gowning airlock illuminance validated.',
    simulationCategory: 'WORKED',
    simulationWorkedNumber: 6,
    isCarriedForward: false,
    createdAt: '2026-01-08T18:30:00.000Z',
    updatedAt: '2026-01-08T18:30:00.000Z'
  },
  {
    id: 'entry-7',
    userEmail: 'mnkavin2006@gmail.com',
    userName: 'M.N. Kavin',
    workDate: '2026-01-09',
    projectName: 'Warehouse Operations',
    taskDescription: 'Warehouse pallet racking collision mesh verification and forklift speed safety limiter test.',
    hoursSpent: 4.0,
    status: 'COMPLETED',
    priority: 'MEDIUM',
    remarks: 'Test pass recorded for warehouse master QA.',
    simulationCategory: 'TESTED',
    simulationTestedNumber: 1,
    isCarriedForward: false,
    createdAt: '2026-01-09T18:30:00.000Z',
    updatedAt: '2026-01-09T18:30:00.000Z'
  },
  {
    id: 'entry-8',
    userEmail: 'mnkavin2006@gmail.com',
    userName: 'M.N. Kavin',
    workDate: '2026-01-10',
    projectName: 'Dispensing of Raw Materials',
    taskDescription: 'Laminar air flow hood scale calibration test and raw chemical cross-contamination alert testing.',
    hoursSpent: 5.5,
    status: 'COMPLETED',
    priority: 'HIGH',
    remarks: 'LAF air curtain airflow visualizer confirmed.',
    simulationCategory: 'TESTED',
    simulationTestedNumber: 2,
    isCarriedForward: false,
    createdAt: '2026-01-10T18:30:00.000Z',
    updatedAt: '2026-01-10T18:30:00.000Z'
  }
];

export class WorksheetService {
  static getAllEntries(): WorkEntry[] {
    if (typeof window === 'undefined') return INITIAL_SAMPLE_ENTRIES;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load work entries from localStorage, using fallback', e);
    }
    this.saveEntries(INITIAL_SAMPLE_ENTRIES);
    return INITIAL_SAMPLE_ENTRIES;
  }

  static saveEntries(entries: WorkEntry[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      window.dispatchEvent(new CustomEvent('workpulse:entries-updated', { detail: entries }));
    } catch (e) {
      console.error('Failed to save entries to localStorage', e);
    }
  }

  static addEntry(entry: Omit<WorkEntry, 'id' | 'createdAt' | 'updatedAt'>): WorkEntry {
    const entries = this.getAllEntries();
    const newEntry: WorkEntry = {
      ...entry,
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newEntry, ...entries];
    this.saveEntries(updated);
    return newEntry;
  }

  static updateEntry(id: string, updates: Partial<WorkEntry>): WorkEntry | null {
    const entries = this.getAllEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return null;
    const updatedEntry: WorkEntry = {
      ...entries[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    entries[index] = updatedEntry;
    this.saveEntries(entries);
    return updatedEntry;
  }

  static deleteEntry(id: string): boolean {
    const entries = this.getAllEntries();
    const filtered = entries.filter(e => e.id !== id);
    if (filtered.length === entries.length) return false;
    this.saveEntries(filtered);
    return true;
  }

  static filterEntries(entries: WorkEntry[], filters: FilterState): WorkEntry[] {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    return entries.filter(entry => {
      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchProject = entry.projectName.toLowerCase().includes(q);
        const matchDesc = entry.taskDescription.toLowerCase().includes(q);
        const matchRemarks = (entry.remarks || '').toLowerCase().includes(q);
        const matchUser = entry.userName.toLowerCase().includes(q);
        if (!matchProject && !matchDesc && !matchRemarks && !matchUser) return false;
      }

      // 2. Status Filter
      if (filters.status !== 'ALL' && entry.status !== filters.status) {
        return false;
      }

      // 3. Priority Filter
      if (filters.priority !== 'ALL' && entry.priority !== filters.priority) {
        return false;
      }

      // 4. Simulation Category Filter
      if (filters.simulationCategory !== 'ALL' && entry.simulationCategory !== filters.simulationCategory) {
        return false;
      }

      // 5. User Email Filter (if specified and not admin looking at ALL)
      if (filters.userEmail && filters.userEmail !== 'ALL' && entry.userEmail !== filters.userEmail) {
        return false;
      }

      // 6. Date Range / Quick Date Preset
      if (filters.datePreset === 'TODAY' && entry.workDate !== today) {
        return false;
      }
      if (filters.datePreset === 'YESTERDAY' && entry.workDate !== yesterday) {
        return false;
      }
      if (filters.datePreset === 'THIS_WEEK') {
        const start = getStartOfWeek();
        const end = getEndOfWeek();
        if (!isDateInRange(entry.workDate, start, end)) return false;
      }
      if (filters.datePreset === 'THIS_MONTH') {
        const start = getStartOfMonth();
        const end = getEndOfMonth();
        if (!isDateInRange(entry.workDate, start, end)) return false;
      }
      if (filters.datePreset === 'CUSTOM') {
        if (filters.startDate && filters.endDate) {
          if (!isDateInRange(entry.workDate, filters.startDate, filters.endDate)) return false;
        }
      }

      return true;
    });
  }

  static calculateMetrics(entries: WorkEntry[]): WorksheetMetrics {
    const totalEntries = entries.length;
    const totalHours = entries.reduce((acc, curr) => acc + (Number(curr.hoursSpent) || 0), 0);
    const completedTasks = entries.filter(e => e.status === 'COMPLETED').length;
    const inProgressTasks = entries.filter(e => e.status === 'IN_PROGRESS').length;
    const onHoldTasks = entries.filter(e => e.status === 'ON_HOLD').length;
    const blockedTasks = entries.filter(e => e.status === 'BLOCKED').length;
    const carriedForwardTasks = entries.filter(e => e.isCarriedForward).length;

    const workedSimulationCount = new Set(
      entries.filter(e => e.simulationWorkedNumber || e.simulationCategory === 'WORKED').map(e => e.projectName)
    ).size;

    const testedSimulationCount = new Set(
      entries.filter(e => e.simulationTestedNumber || e.simulationCategory === 'TESTED').map(e => e.projectName)
    ).size;

    const completionRate = totalEntries > 0 ? Math.round((completedTasks / totalEntries) * 100) : 0;

    return {
      totalEntries,
      totalHours: parseFloat(totalHours.toFixed(1)),
      completedTasks,
      inProgressTasks,
      onHoldTasks,
      blockedTasks,
      carriedForwardTasks,
      workedSimulationCount,
      testedSimulationCount,
      completionRate
    };
  }
}
