import * as XLSX from 'xlsx';
import { WorkEntry } from '@/shared/types';
import { SimulationService } from '@/modules/simulations/simulation.service';
import { formatDateDisplay } from '@/shared/utils/formatting';
import { getTodayString } from '@/shared/utils/date';

export class ExportService {
  static exportToExcel(entries: WorkEntry[]): void {
    const workbook = XLSX.utils.book_new();

    // 1. Daily Work Logs Sheet
    const logsData = entries.map((e, idx) => ({
      '#': idx + 1,
      'Work Date': e.workDate,
      'Simulation / Project': e.projectName,
      'Category': e.simulationCategory || 'GENERAL',
      'Carried Forward': e.isCarriedForward ? 'Yes' : 'No',
      'Tasks Completed': e.taskDescription,
      'Hours Spent': e.hoursSpent,
      'Status': e.status,
      'Priority': e.priority,
      'Remarks': e.remarks || '',
      'User': e.userName,
      'Email': e.userEmail
    }));
    const logsSheet = XLSX.utils.json_to_sheet(logsData);
    XLSX.utils.book_append_sheet(workbook, logsSheet, 'Daily Work Logs');

    // 2. Worked Simulations Matrix Sheet
    const matrix = SimulationService.calculateMatrix(entries);
    const workedData = matrix.workedMatrix.map(m => ({
      '#': m.number,
      'Simulation Project (Worked)': m.title,
      'Total Hours Logged': m.totalHours,
      'Total Sessions': m.entriesCount,
      'Status': m.isCompleted ? 'COMPLETED' : m.entriesCount > 0 ? 'IN PROGRESS' : 'NOT STARTED',
      'Last Worked Date': m.lastWorkedDate ? formatDateDisplay(m.lastWorkedDate) : '—'
    }));
    const workedSheet = XLSX.utils.json_to_sheet(workedData);
    XLSX.utils.book_append_sheet(workbook, workedSheet, '12 Worked Simulations');

    // 3. Tested Simulations Matrix Sheet
    const testedData = matrix.testedMatrix.map(m => ({
      '#': m.number,
      'Simulation Project (Tested)': m.title,
      'Total Hours Logged': m.totalHours,
      'Total Sessions': m.entriesCount,
      'Status': m.isCompleted ? 'COMPLETED' : m.entriesCount > 0 ? 'IN PROGRESS' : 'NOT STARTED',
      'Last Tested Date': m.lastWorkedDate ? formatDateDisplay(m.lastWorkedDate) : '—'
    }));
    const testedSheet = XLSX.utils.json_to_sheet(testedData);
    XLSX.utils.book_append_sheet(workbook, testedSheet, '7 Tested Simulations');

    // Write file
    XLSX.writeFile(workbook, `WorkPulse_Report_${getTodayString()}.xlsx`);
  }

  static exportToJson(entries: WorkEntry[]): void {
    // A Blob URL works for large backups; a data: URL can fail past a few MB.
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workpulse_backup_${getTodayString()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
