/**
 * Import & Export Management Module
 * Supports Excel (.xlsx), CSV, JSON, Print/PDF, and WhatsApp/Slack Daily Status Report generator.
 */

class ImportExportManager {
  constructor(manager, ui) {
    this.manager = manager;
    this.ui = ui;
    this.parsedImportData = [];
  }

  // Export to Excel (.xlsx) using SheetJS
  exportToExcel(entries = this.manager.getFilteredEntries()) {
    if (!entries || entries.length === 0) {
      this.ui.showToast('No entries to export', 'error');
      return;
    }

    if (!window.XLSX) {
      this.ui.showToast('Excel exporter library not loaded', 'error');
      return;
    }

    const rows = entries.map(e => ({
      'Date': e.date,
      'Project Name': e.projectName,
      'Work Description': e.work,
      'Status': e.status,
      'Hours': e.hoursWorked || 0,
      'Priority': e.priority || 'Medium',
      'Remarks': e.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 22 }, // Project
      { wch: 45 }, // Work
      { wch: 15 }, // Status
      { wch: 8 },  // Hours
      { wch: 12 }, // Priority
      { wch: 30 }  // Remarks
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Worksheet');

    const fileName = `Worksheet_${WorksheetManager.getTodayStr()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    this.ui.showToast(`Exported ${entries.length} rows to ${fileName}`, 'success');
  }

  // Export to CSV
  exportToCsv(entries = this.manager.getFilteredEntries()) {
    if (!entries || entries.length === 0) {
      this.ui.showToast('No entries to export', 'error');
      return;
    }

    const headers = ['Date', 'Project Name', 'Work Description', 'Status', 'Hours', 'Priority', 'Remarks'];
    const rows = entries.map(e => [
      e.date,
      `"${(e.projectName || '').replace(/"/g, '""')}"`,
      `"${(e.work || '').replace(/"/g, '""')}"`,
      e.status,
      e.hoursWorked || 0,
      e.priority || 'Medium',
      `"${(e.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Worksheet_${WorksheetManager.getTodayStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.ui.showToast(`Exported CSV successfully!`, 'success');
  }

  // Export to JSON Backup
  exportToJson(entries = this.manager.entries) {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `WorkPulse_Backup_${WorksheetManager.getTodayStr()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.ui.showToast('JSON backup exported successfully!', 'success');
  }

  // Print Daily Worksheet
  printWorksheet() {
    window.print();
  }

  // Parse Uploaded CSV / Excel / JSON File
  async handleFileUpload(file) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          this.previewImport(this.normalizeImportList(json));
        } else {
          this.ui.showToast('Invalid JSON file structure', 'error');
        }
      } catch (err) {
        this.ui.showToast('Failed to parse JSON file', 'error');
      }
    } else if (fileName.endsWith('.csv')) {
      if (window.Papa) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const list = this.mapImportRows(results.data);
            this.previewImport(list);
          },
          error: (err) => this.ui.showToast(`CSV parse error: ${err.message}`, 'error')
        });
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      if (!window.XLSX) {
        this.ui.showToast('Excel reader library not loaded', 'error');
        return;
      }
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet);
      const list = this.mapImportRows(json);
      this.previewImport(list);
    } else {
      this.ui.showToast('Unsupported file type. Please upload .csv or .xlsx', 'error');
    }
  }

  // Smart column mapping from external spreadsheet headers
  mapImportRows(rawRows) {
    return rawRows.map(row => {
      const normalized = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase();
        normalized[cleanKey] = row[key];
      });

      // Find Date
      const dateVal = normalized['date'] || normalized['work date'] || normalized['day'] || WorksheetManager.getTodayStr();
      
      // Find Project
      const projectVal = normalized['project name'] || normalized['project'] || normalized['client'] || 'General';
      
      // Find Work Description
      const workVal = normalized['work description'] || normalized['work'] || normalized['task'] || normalized['description'] || normalized['work done'] || '';

      // Find Status
      let statusVal = normalized['status'] || normalized['work status'] || 'In Progress';
      if (typeof statusVal === 'string') {
        const s = statusVal.trim().toLowerCase();
        if (s.includes('comp') || s.includes('done')) statusVal = 'Completed';
        else if (s.includes('prog')) statusVal = 'In Progress';
        else if (s.includes('pend')) statusVal = 'Pending';
        else if (s.includes('block')) statusVal = 'Blocked';
        else if (s.includes('rev')) statusVal = 'Under Review';
      }

      // Find Hours
      const hoursVal = parseFloat(normalized['hours'] || normalized['hours worked'] || normalized['duration'] || normalized['time'] || 0);

      // Find Priority
      const priorityVal = normalized['priority'] || 'Medium';

      // Find Remarks
      const remarksVal = normalized['remarks'] || normalized['notes'] || normalized['blockers'] || '';

      return {
        id: 'import-' + Math.random().toString(36).substring(2, 9),
        date: String(dateVal).substring(0, 10),
        projectName: String(projectVal).trim(),
        work: String(workVal).trim(),
        status: statusVal,
        hoursWorked: isNaN(hoursVal) ? 0 : hoursVal,
        priority: priorityVal,
        remarks: String(remarksVal).trim()
      };
    }).filter(item => item.work.length > 0 || item.projectName.length > 0);
  }

  normalizeImportList(list) {
    return list.map(item => ({
      id: item.id || 'import-' + Math.random().toString(36).substring(2, 9),
      date: item.date || WorksheetManager.getTodayStr(),
      projectName: item.projectName || item.project_name || 'General',
      work: item.work || item.description || '',
      status: item.status || 'In Progress',
      hoursWorked: parseFloat(item.hoursWorked || item.hours_worked || 0),
      priority: item.priority || 'Medium',
      remarks: item.remarks || ''
    }));
  }

  // Preview import in UI
  previewImport(list) {
    this.parsedImportData = list;
    const previewBox = document.getElementById('importPreviewArea');
    const previewCount = document.getElementById('importPreviewCount');
    const tableWrap = document.getElementById('previewTableWrap');

    if (list.length === 0) {
      this.ui.showToast('No valid rows found in file', 'error');
      previewBox.classList.add('hidden');
      return;
    }

    previewCount.textContent = `${list.length} row(s) ready to import`;
    
    // Build mini preview table
    const sample = list.slice(0, 5);
    tableWrap.innerHTML = `
      <table class="worksheet-table" style="font-size: 0.75rem;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Project</th>
            <th>Work</th>
            <th>Status</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          ${sample.map(r => `
            <tr>
              <td>${r.date}</td>
              <td><strong>${r.projectName}</strong></td>
              <td>${r.work.substring(0, 50)}${r.work.length > 50 ? '...' : ''}</td>
              <td>${r.status}</td>
              <td>${r.hoursWorked}h</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    previewBox.classList.remove('hidden');
  }

  // Confirm and save imported records
  async confirmImport() {
    if (this.parsedImportData.length === 0) return;
    
    await this.manager.storage.batchImport(this.parsedImportData);
    await this.manager.initialize();
    
    this.ui.showToast(`Imported ${this.parsedImportData.length} records successfully!`, 'success');
    this.parsedImportData = [];
    document.getElementById('importPreviewArea').classList.add('hidden');
    document.getElementById('importFileInput').value = '';
  }

  // Generate Daily Status Report (WhatsApp / Slack / Email formatted)
  generateDailyReportText(dateStr = WorksheetManager.getTodayStr(), format = 'standard') {
    const entries = this.manager.entries.filter(e => e.date === dateStr);
    const metrics = this.manager.getMetrics(entries);
    const formattedDate = UIRenderer.formatDisplayDate(dateStr);

    if (entries.length === 0) {
      return `📅 Daily Status Report - ${formattedDate}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\nNo tasks recorded for this date.`;
    }

    const completed = entries.filter(e => e.status === 'Completed');
    const inProgress = entries.filter(e => e.status === 'In Progress');
    const pending = entries.filter(e => e.status === 'Pending');
    const blocked = entries.filter(e => e.status === 'Blocked');
    const review = entries.filter(e => e.status === 'Under Review');
    const leave = entries.filter(e => e.status === 'Leave');

    if (format === 'compact') {
      let lines = [`📋 Daily Status (${formattedDate})`];
      entries.forEach(e => {
        const icon = e.status === 'Completed' ? '✅' : (e.status === 'In Progress' ? '🔄' : (e.status === 'Leave' ? '🏖️' : '⏳'));
        lines.push(`${icon} [${e.projectName}] ${e.work} (${e.hoursWorked || 0}h)`);
      });
      lines.push(`Total: ${metrics.totalTasks} tasks | ${metrics.totalHours} hrs`);
      return lines.join('\n');
    }

    if (format === 'bullets') {
      let lines = [`*Work Report - ${formattedDate}*`];
      if (completed.length > 0) {
        lines.push(`\n*Completed:*`);
        completed.forEach(e => lines.push(`• [${e.projectName}] ${e.work}`));
      }
      if (inProgress.length > 0) {
        lines.push(`\n*In Progress / Doing:*`);
        inProgress.forEach(e => lines.push(`• [${e.projectName}] ${e.work}`));
      }
      if (pending.length > 0 || blocked.length > 0) {
        lines.push(`\n*Pending / Blocked:*`);
        [...pending, ...blocked].forEach(e => lines.push(`• [${e.projectName}] ${e.work} ${e.remarks ? `(${e.remarks})` : ''}`));
      }
      if (leave.length > 0) {
        lines.push(`\n*Leave / Off:*`);
        leave.forEach(e => lines.push(`• 🏖️ ${e.work}`));
      }
      return lines.join('\n');
    }

    // Standard Formatted Mode
    let output = [];
    output.push(`📋 DAILY OFFICE STATUS REPORT`);
    output.push(`📅 Date: ${formattedDate}`);
    output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (leave.length > 0 && completed.length === 0 && inProgress.length === 0) {
      output.push(`\n🏖️ STATUS: ${leave[0].work || 'Official Leave / Off'}`);
      output.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return output.join('\n');
    }

    if (completed.length > 0) {
      output.push(`\n✅ COMPLETED TASKS (${completed.length}):`);
      completed.forEach(e => {
        const hrs = e.hoursWorked ? ` [${e.hoursWorked}h]` : '';
        output.push(`• [${e.projectName}] ${e.work}${hrs}`);
        if (e.remarks) output.push(`  ↳ Note: ${e.remarks}`);
      });
    }

    if (inProgress.length > 0) {
      output.push(`\n🔄 IN PROGRESS (${inProgress.length}):`);
      inProgress.forEach(e => {
        const hrs = e.hoursWorked ? ` [${e.hoursWorked}h]` : '';
        output.push(`• [${e.projectName}] ${e.work}${hrs}`);
        if (e.remarks) output.push(`  ↳ Note: ${e.remarks}`);
      });
    }

    if (pending.length > 0) {
      output.push(`\n⏳ PENDING / UPCOMING (${pending.length}):`);
      pending.forEach(e => {
        output.push(`• [${e.projectName}] ${e.work}`);
        if (e.remarks) output.push(`  ↳ Note: ${e.remarks}`);
      });
    }

    if (blocked.length > 0) {
      output.push(`\n🛑 BLOCKED / NEED HELP (${blocked.length}):`);
      blocked.forEach(e => {
        output.push(`• [${e.projectName}] ${e.work}`);
        if (e.remarks) output.push(`  ↳ Blocker: ${e.remarks}`);
      });
    }

    if (review.length > 0) {
      output.push(`\n🔍 UNDER REVIEW (${review.length}):`);
      review.forEach(e => output.push(`• [${e.projectName}] ${e.work}`));
    }

    if (leave.length > 0) {
      output.push(`\n🏖️ LEAVE / OFF (${leave.length}):`);
      leave.forEach(e => output.push(`• ${e.work}`));
    }

    output.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    output.push(`📊 Summary: ${metrics.totalTasks} Tasks | ${metrics.completedCount} Completed (${metrics.completionRate}%) | ${metrics.totalHours} hrs logged`);

    return output.join('\n');
  }
}

window.ImportExportManager = ImportExportManager;
