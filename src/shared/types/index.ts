export type Role = 'ADMIN' | 'TEAM_MEMBER';
export type WorkType = 'Worked' | 'Tested';
export type TaskStatus = 'Completed' | 'In Progress' | 'Pending' | 'Blocked' | 'Under Review' | 'Leave';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  role: 'Admin' | 'Team Member';
  avatar?: string;
  color: string;
}

export interface WorkEntryItem {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  projectName: string;
  workType: 'Worked' | 'Tested';
  work: string;
  status: TaskStatus;
  hoursWorked: number;
  priority: Priority;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorksheetFilterState {
  dateRange: 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all' | 'custom';
  customStartDate: string | null;
  customEndDate: string | null;
  project: string;
  status: string;
  search: string;
  workType: 'all' | 'Worked' | 'Tested';
  userScope: 'me' | 'all' | string;
}

export interface WorksheetMetrics {
  totalTasks: number;
  totalHours: string;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  leave: number;
  completionRate: number;
  projectHours: Record<string, number>;
}

export interface SimulationMatrixItem {
  num: number;
  name: string;
  type: 'Worked' | 'Tested';
  totalTasks: number;
  completedTasks: number;
  totalHours: string;
  progress: number;
}

export interface SimulationMatrixSummary {
  worked: SimulationMatrixItem[];
  tested: SimulationMatrixItem[];
  summary: {
    totalWorkedCount: number;
    activeWorkedCount: number;
    totalTestedCount: number;
    activeTestedCount: number;
  };
}