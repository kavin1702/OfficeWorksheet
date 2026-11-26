import { WorkEntry } from '@/shared/types';
import { formatDateDisplay } from '@/shared/utils/formatting';

export class ReportService {
  static generateDailyMarkdown(date: string, entries: WorkEntry[], userName: string): string {
    const dayEntries = entries.filter(e => e.workDate === date);
    const totalHours = dayEntries.reduce((acc, curr) => acc + curr.hoursSpent, 0);

    let md = `*Daily Work Status Report — ${formatDateDisplay(date)}*\n`;
    md += `*Engineer:* ${userName}\n`;
    md += `*Total Hours Logged:* ${totalHours} hrs\n\n`;

    if (dayEntries.length === 0) {
      md += `_No activities logged for this date._\n`;
      return md;
    }

    md += `*Key Tasks Completed & Progress:*\n`;
    dayEntries.forEach((entry, idx) => {
      const statusEmoji = entry.status === 'COMPLETED' ? '✅' : entry.status === 'IN_PROGRESS' ? '⏳' : '⚠️';
      md += `${idx + 1}. *${entry.projectName}* (${entry.hoursSpent}h) - ${statusEmoji} ${entry.status}\n`;
      md += `   • ${entry.taskDescription}\n`;
      if (entry.remarks) {
        md += `   • _Note: ${entry.remarks}_\n`;
      }
    });

    return md;
  }
}
