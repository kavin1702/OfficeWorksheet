// Shared domain types for WorkPulse.
// One source of truth: every module, the API routes and the Google Sheet
// columns use these exact names and values.

export type UserRole = 'ADMIN' | 'TEAM_MEMBER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkStatus = 'COMPLETED' | 'IN_PROGRESS' | 'ON_HOLD' | 'BLOCKED';
export type WorkPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SimulationCategory = 'WORKED' | 'TESTED';

export const WORK_STATUSES: WorkStatus[] = ['COMPLETED', 'IN_PROGRESS', 'ON_HOLD', 'BLOCKED'];
export const WORK_PRIORITIES: WorkPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface WorkEntry {
  id: string;
  userEmail: string;
  userName: string;
  workDate: string; // YYYY-MM-DD
  projectName: string;
  taskDescription: string;
  hoursSpent: number;
  status: WorkStatus;
  priority: WorkPriority;
  remarks?: string;
  simulationCategory?: SimulationCategory;
  simulationWorkedNumber?: number;
  simulationTestedNumber?: number;
  isCarriedForward: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The fields a user fills in; the server adds id and timestamps. */
export type WorkEntryInput = Omit<WorkEntry, 'id' | 'createdAt' | 'updatedAt'>;

export type ViewMode = 'TABLE' | 'MATRIX' | 'CALENDAR' | 'ANALYTICS';
export type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export interface FilterState {
  searchQuery: string;
  status: WorkStatus | 'ALL';
  priority: WorkPriority | 'ALL';
  simulationCategory: SimulationCategory | 'ALL';
  datePreset: DatePreset;
  userEmail: string | 'ALL';
  startDate?: string;
  endDate?: string;
}

export interface WorksheetMetrics {
  totalEntries: number;
  totalHours: number;
  completedTasks: number;
  inProgressTasks: number;
  onHoldTasks: number;
  blockedTasks: number;
  carriedForwardTasks: number;
  workedSimulationCount: number;
  testedSimulationCount: number;
  completionRate: number;
}

export interface SimulationMasterItem {
  id: string;
  number: number;
  title: string;
  category: SimulationCategory;
  description: string;
  defaultHours: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface SimulationMatrixItem {
  number: number;
  title: string;
  category: SimulationCategory;
  totalHours: number;
  entriesCount: number;
  lastWorkedDate: string | null;
  statusCount: Record<WorkStatus, number>;
  isCompleted: boolean;
  entries: WorkEntry[];
}

export interface CalendarDayData {
  date: string;
  dayNumber: number;
  entries: WorkEntry[];
  totalHours: number;
  isCurrentMonth: boolean;
  isCompleted: boolean;
  hasInProgress: boolean;
}

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'LOCAL_ONLY';

export interface CloudSyncConfig {
  autoSync: boolean;
  lastSyncTime: string | null;
  syncStatus: SyncStatus;
}
