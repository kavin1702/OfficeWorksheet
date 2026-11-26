import { getTodayString, getYesterdayString, parseIsoDate } from './date';

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr === getTodayString()) {
    return 'Today, ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (dateStr === getYesterdayString()) return 'Yesterday';
  const d = parseIsoDate(dateStr);
  return d ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : dateStr;
}

export function formatHours(hours: number): string {
  const n = Number(hours) || 0;
  return `${Number.isInteger(n) ? n : n.toFixed(1)}h`;
}

export function getUserColor(name: string): string {
  if (!name) return '#2563eb';
  const colors = ['#2563eb', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'ON_HOLD':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'BLOCKED':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    case 'HIGH':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'LOW':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return '✓';
    case 'IN_PROGRESS':
      return '●';
    case 'ON_HOLD':
      return '❚❚';
    case 'BLOCKED':
      return '✕';
    default:
      return '•';
  }
}

export function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return '▲▲';
    case 'HIGH':
      return '▲';
    case 'LOW':
      return '▼';
    default:
      return '■';
  }
}

export function formatStatusLabel(status: string): string {
  return (status || '').replace(/_/g, ' ');
}
