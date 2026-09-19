export function getUserColor(name: string): string {
  if (!name) return '#2563eb';
  const colors = ['#2563eb', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getStatusMeta(status: string) {
  switch (status) {
    case 'Completed':
      return { cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', label: 'Completed' };
    case 'In Progress':
      return { cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30', label: 'In Progress' };
    case 'Pending':
      return { cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30', label: 'Pending' };
    case 'Blocked':
      return { cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30', label: 'Blocked' };
    case 'Under Review':
      return { cls: 'bg-purple-500/15 text-purple-500 border-purple-500/30', label: 'Under Review' };
    case 'Leave':
      return { cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', label: 'Leave / Off' };
    default:
      return { cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30', label: status || 'In Progress' };
  }
}

export function getPriorityMeta(priority: string) {
  switch ((priority || '').toLowerCase()) {
    case 'urgent':
      return { cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', label: 'Urgent' };
    case 'high':
      return { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'High' };
    case 'low':
      return { cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', label: 'Low' };
    default:
      return { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30', label: 'Medium' };
  }
}