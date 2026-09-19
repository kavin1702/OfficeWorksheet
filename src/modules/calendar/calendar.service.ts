import { CalendarDayData, WorkEntry } from '@/shared/types';
import { formatDateDisplay } from '@/shared/utils/formatting';

export class CalendarService {
  static getMonthGrid(year: number, month: number, entries: WorkEntry[]): CalendarDayData[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // 0 is Sunday, 1 is Monday...
    const startDayOfWeek = firstDay.getDay();

    const grid: CalendarDayData[] = [];

    // Map entries by date YYYY-MM-DD
    const entryMap = new Map<string, WorkEntry[]>();
    entries.forEach(entry => {
      const list = entryMap.get(entry.workDate) || [];
      list.push(entry);
      entryMap.set(entry.workDate, list);
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEntries = entryMap.get(dateStr) || [];
      const totalHours = dayEntries.reduce((acc, curr) => acc + curr.hoursSpent, 0);
      const isCompleted = dayEntries.length > 0 && dayEntries.every(e => e.status === 'COMPLETED');
      const hasInProgress = dayEntries.some(e => e.status === 'IN_PROGRESS');

      grid.push({
        date: dateStr,
        dayNumber: d,
        entries: dayEntries,
        totalHours: parseFloat(totalHours.toFixed(1)),
        isCurrentMonth: true,
        isCompleted,
        hasInProgress
      });
    }

    return grid;
  }
}
