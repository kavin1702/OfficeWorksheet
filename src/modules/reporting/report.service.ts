import { WorkEntry } from '@/shared/types';
import { formatDateDisplay } from '@/shared/utils/formatting';

export class ReportService {
  static generateDailyMarkdown(date: string, entries: WorkEntry[], userName: string): string {
    const dayEntries = entries.filter(e => e.workDate === date);
    const totalHours = dayEntries.reduce((acc, curr) => acc + curr.hoursSpent, 0);

    let md = `*Daily Work Status Report â€” ${formatDateDisplay(date)}*\n`;
    md += `*Engineer:* ${userName}\n`;
    md += `*Total Hours Logged:* ${totalHours} hrs\n\n`;

    if (dayEntries.length === 0) {
      md += `_No activities logged for this date._\n`;
      return md;
    }

    md += `*Key Tasks Completed & Progress:*\n`;
    dayEntries.forEach((entry, idx) => {
      const statusEmoji = entry.status === 'COMPLETED' ? 'âœ…' : entry.status === 'IN_PROGRESS' ? 'â³' : 'âš ï¸';
      md += `${idx + 1}. *${entry.projectName}* (${entry.hoursSpent}h) - ${statusEmoji} ${entry.status}\n`;
      md += `   â€¢ ${entry.taskDescription}\n`;
      if (entry.remarks) {
        md += `   â€¢ _Note: ${entry.remarks}_\n`;
      }
    });

    return md;
  }
}
