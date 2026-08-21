/**
 * Import & Export Management Module (WorkPulse)
 * High-compatibility Excel (.xlsx, .xls), CSV, JSON, and Direct Copy-Paste Importer
 * with smart column heuristic detection, automatic multi-format date normalization,
 * multi-user tagging, and live Google Sheets sync.
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
      this.ui.showToast('Excel exporter library loading...', 'info');
      return;
    }

    const rows = entries.map(e => ({
      'Date': e.date,
      'User': e.userName || 'Kavin',
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
      { wch: 14 }, // User
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

    const headers = ['Date', 'User', 'Project Name', 'Work Description', 'Status', 'Hours', 'Priority', 'Remarks'];
    const rows = entries.map(e => [
      e.date,
      `"${(e.userName || 'Kavin').replace(/"/g, '""')}"`,
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

  // Parse Excel Date formats (Numbers, Strings, Slash formats)
  parseExcelDate(val) {
    if (!val) return WorksheetManager.getTodayStr();

    let str = String(val).trim();

    // 1. If year is 2001 or 01, fix to 2026
    if (str.startsWith('2001-08-') || str.startsWith('2001-8-')) {
      str = '2026-08-' + str.substring(str.lastIndexOf('-') + 1).padStart(2, '0');
    }

    // 2. If already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // 3. If Excel numeric serial date (e.g. 46237)
    if (typeof val === 'number' || (!isNaN(val) && !isNaN(parseFloat(val)) && parseFloat(val) > 20000 && parseFloat(val) < 60000)) {
      try {
        const num = parseFloat(val);
        const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(jsDate.getTime())) {
          return WorksheetManager.formatDateIso(jsDate);
        }
      } catch (e) {}
    }

    // 4. String formats: DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
    const match = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/);
    if (match) {
      let p1 = parseInt(match[1], 10);
      let p2 = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;
      if (year === 2001) year = 2026;

      let day = p1;
      let month = p2;
      if (p1 <= 12 && p2 > 12) {
        month = p1;
        day = p2;
      }

      const dObj = new Date(year, month - 1, day);
      if (!isNaN(dObj.getTime())) {
        return WorksheetManager.formatDateIso(dObj);
      }
    }

    // 5. Try general Date parser
    try {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        let yr = parsed.getFullYear();
        if (yr === 2001) yr = 2026;
        const mo = String(parsed.getMonth() + 1).padStart(2, '0');
        const da = String(parsed.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      }
    } catch (e) {}

    return WorksheetManager.getTodayStr();
  }

  // Parse Direct Pasted Text from Excel or Google Sheets
  handlePastedText(rawText) {
    if (!rawText || !rawText.trim()) {
      this.ui.showToast('Please paste data from Excel into the box first.', 'error');
      return;
    }

    const lines = rawText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      this.ui.showToast('No data found in pasted text', 'error');
      return;
    }

    const rows = lines.map(line => {
      // Split by tab (Excel standard) or comma (CSV)
      if (line.includes('\t')) {
        return line.split('\t').map(c => c.trim());
      }
      return line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    });

    // Check if first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = firstLineLower.includes('date') || firstLineLower.includes('project') || firstLineLower.includes('work') || firstLineLower.includes('task');
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const list = dataRows.map(cols => {
      let dateVal = WorksheetManager.getTodayStr();
      let projectVal = 'General';
      let workVal = '';
      let statusVal = 'In Progress';
      let hoursVal = 8;
      let priorityVal = 'Medium';
      let remarksVal = '';

      cols.forEach((col, idx) => {
        const clean = col.trim();
        if (!clean) return;

        // Check if date
        if (/^\d{1,4}[-/. ]\w+[-/. ]\d{1,4}$|^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(clean)) {
          dateVal = this.parseExcelDate(clean);
        }
        // Check if status
        else if (/^(completed|in progress|pending|blocked|under review|leave)$/i.test(clean)) {
          const s = clean.toLowerCase();
          if (s.includes('comp') || s.includes('done')) statusVal = 'Completed';
          else if (s.includes('prog')) statusVal = 'In Progress';
          else if (s.includes('pend')) statusVal = 'Pending';
          else if (s.includes('block')) statusVal = 'Blocked';
          else if (s.includes('rev')) statusVal = 'Under Review';
          else if (s.includes('leave')) statusVal = 'Leave';
        }
        // Check if hours (numeric)
        else if (!isNaN(parseFloat(clean)) && parseFloat(clean) <= 24 && idx >= 2 && !clean.includes('-') && !clean.includes('/')) {
          hoursVal = parseFloat(clean);
        }
        // Check if priority
        else if (/^(high|medium|low|urgent)$/i.test(clean)) {
          priorityVal = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
        }
        // Otherwise text (Project or Work or Remarks)
        else {
          if (projectVal === 'General' && clean.length < 40 && !workVal) {
            projectVal = clean;
          } else if (!workVal) {
            workVal = clean;
          } else {
            remarksVal = (remarksVal ? remarksVal + ' | ' : '') + clean;
          }
        }
      });

      if (!workVal && projectVal !== 'General') {
        workVal = projectVal;
        projectVal = 'General';
      }

      const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

      return {
        id: 'paste-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
        userId: currentUser ? currentUser.id : 'user_kavin',
        userName: currentUser ? currentUser.name : 'Kavin',
        date: dateVal,
        projectName: projectVal || 'General',
        work: workVal,
        status: statusVal,
        hoursWorked: hoursVal || 0,
        priority: priorityVal,
        remarks: remarksVal
      };
    }).filter(r => r.work.length > 0 || r.projectName !== 'General');

    this.previewImport(list);
  }

  // Parse Uploaded CSV / Excel / JSON File
  async handleFileUpload(file) {
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          this.previewImport(this.normalizeImportList(json));
        } else {
          this.ui.showToast('Invalid JSON structure: Expected an array of records', 'error');
        }
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        this.handlePastedText(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (!window.XLSX) {
          this.ui.showToast('Loading Excel reader... Please try again in a few seconds.', 'info');
          return;
        }

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd',
          raw: false
        });

        let allRows = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, {
            raw: false,
            defval: '',
            blankrows: false
          });
          if (rows && rows.length > 0) {
            allRows = allRows.concat(rows);
          }
        }

        if (allRows.length === 0) {
          this.ui.showToast('The uploaded Excel file appears to be empty', 'error');
          return;
        }

        const list = this.mapImportRows(allRows);
        this.previewImport(list);
      } else {
        this.ui.showToast('Unsupported file type. Please upload .xlsx, .xls, or .csv', 'error');
      }
    } catch (err) {
      console.error('File upload error:', err);
      this.ui.showToast(`Failed to parse file: ${err.message}`, 'error');
    }
  }

  // Smart column mapping from external spreadsheet headers
  mapImportRows(rawRows) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    return rawRows.map(row => {
      const normalized = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        normalized[cleanKey] = row[key];
      });

      // 1. Date Finder
      let rawDate = normalized['date'] || normalized['workdate'] || normalized['taskdate'] || normalized['day'] || normalized['dt'] || '';
      const dateVal = this.parseExcelDate(rawDate);

      // 2. Project Name Finder
      const projectVal = normalized['projectname'] || normalized['project'] || normalized['client'] || normalized['module'] || normalized['feature'] || normalized['title'] || 'General';

      // 3. Work Description Finder
      const workVal = normalized['workdescription'] || normalized['work'] || normalized['task'] || normalized['taskdescription'] || normalized['description'] || normalized['workdone'] || normalized['activity'] || normalized['details'] || normalized['summary'] || '';

      // 4. Status Finder
      let statusVal = normalized['status'] || normalized['workstatus'] || normalized['taskstatus'] || normalized['state'] || 'In Progress';
      if (typeof statusVal === 'string') {
        const s = statusVal.trim().toLowerCase();
        if (s.includes('comp') || s.includes('done') || s.includes('finish')) statusVal = 'Completed';
        else if (s.includes('prog') || s.includes('doing') || s.includes('work')) statusVal = 'In Progress';
        else if (s.includes('pend') || s.includes('wait') || s.includes('todo') || s.includes('open')) statusVal = 'Pending';
        else if (s.includes('block') || s.includes('hold') || s.includes('stop')) statusVal = 'Blocked';
        else if (s.includes('rev') || s.includes('test') || s.includes('qa')) statusVal = 'Under Review';
        else if (s.includes('leave') || s.includes('holiday') || s.includes('off')) statusVal = 'Leave';
        else statusVal = 'In Progress';
      }

      // 5. Hours Finder
      let hoursRaw = normalized['hours'] || normalized['hoursworked'] || normalized['hoursspent'] || normalized['duration'] || normalized['time'] || normalized['hrs'] || 8;
      let hoursVal = parseFloat(String(hoursRaw).replace(/[^0-9.]/g, '')) || 0;

      // 6. Priority Finder
      let priorityVal = normalized['priority'] || normalized['urgency'] || 'Medium';
      if (typeof priorityVal === 'string') {
        const p = priorityVal.toLowerCase();
        if (p.includes('urg')) priorityVal = 'Urgent';
        else if (p.includes('high')) priorityVal = 'High';
        else if (p.includes('low')) priorityVal = 'Low';
        else priorityVal = 'Medium';
      }

      // 7. Remarks Finder
      const remarksVal = normalized['remarks'] || normalized['remark'] || normalized['notes'] || normalized['note'] || normalized['comments'] || normalized['blockers'] || '';

      // 8. User Finder
      const userVal = normalized['user'] || normalized['username'] || normalized['employeename'] || (currentUser ? currentUser.name : 'Kavin');

      return {
        id: 'import-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
        userId: currentUser ? currentUser.id : 'user_kavin',
        userName: userVal || (currentUser ? currentUser.name : 'Kavin'),
        date: dateVal,
        projectName: String(projectVal).trim(),
        work: String(workVal).trim(),
        status: statusVal,
        hoursWorked: hoursVal,
        priority: priorityVal,
        remarks: String(remarksVal).trim()
      };
    }).filter(item => item.work.length > 0 || (item.projectName.length > 0 && item.projectName !== 'General'));
  }

  normalizeImportList(list) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    return list.map(item => ({
      id: item.id || 'import-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      userId: item.userId || (currentUser ? currentUser.id : 'user_kavin'),
      userName: item.userName || (currentUser ? currentUser.name : 'Kavin'),
      date: this.parseExcelDate(item.date),
      projectName: item.projectName || item.project_name || 'General',
      work: item.work || item.description || '',
      status: item.status || 'In Progress',
      hoursWorked: parseFloat(item.hoursWorked || item.hours_worked || 0) || 0,
      priority: item.priority || 'Medium',
      remarks: item.remarks || ''
    })).filter(item => item.work.length > 0 || item.projectName.length > 0);
  }

  // Preview import in UI
  previewImport(list) {
    this.parsedImportData = list;
    const previewBox = document.getElementById('importPreviewArea');
    const previewCount = document.getElementById('importPreviewCount');
    const tableWrap = document.getElementById('previewTableWrap');

    if (!previewBox || !previewCount || !tableWrap) return;

    if (list.length === 0) {
      this.ui.showToast('No valid tasks found. Please ensure data includes Date, Project, or Work Description.', 'error');
      previewBox.classList.add('hidden');
      return;
    }

    previewCount.textContent = `✨ ${list.length} task(s) ready to import`;
    
    // Build preview table
    const sample = list.slice(0, 6);
    tableWrap.innerHTML = `
      <table class="worksheet-table" style="font-size: 0.78rem; width: 100%;">
        <thead>
          <tr>
            <th>Date</th>
            <th>Project</th>
            <th>Work Description</th>
            <th>Status</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          ${sample.map(r => `
            <tr>
              <td><span style="font-weight: 600;">${r.date}</span></td>
              <td><span class="project-pill" style="font-size: 0.72rem;">${this.escapeHtml(r.projectName)}</span></td>
              <td>${this.escapeHtml(r.work.substring(0, 60))}${r.work.length > 60 ? '...' : ''}</td>
              <td><span style="font-size: 0.75rem;">${r.status}</span></td>
              <td><strong>${r.hoursWorked}h</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    previewBox.classList.remove('hidden');
    this.ui.showToast(`Detected ${list.length} tasks! Click "Confirm & Import Data" below.`, 'success');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Confirm and save imported records
  async confirmImport() {
    if (this.parsedImportData.length === 0) {
      this.ui.showToast('No data to import', 'error');
      return;
    }
    
    try {
      this.ui.showToast(`Importing ${this.parsedImportData.length} records into your worksheet and Google Sheet...`, 'info');
      await this.manager.storage.batchImport(this.parsedImportData);
      await this.manager.initialize();
      
      this.ui.showToast(`🎉 Successfully imported ${this.parsedImportData.length} tasks!`, 'success');
      this.parsedImportData = [];
      const previewBox = document.getElementById('importPreviewArea');
      if (previewBox) previewBox.classList.add('hidden');
      const fileInput = document.getElementById('importFileInput');
      if (fileInput) fileInput.value = '';
      const pasteArea = document.getElementById('importPasteTextarea');
      if (pasteArea) pasteArea.value = '';
    } catch (err) {
      console.error('Import error:', err);
      this.ui.showToast(`Import failed: ${err.message}`, 'error');
    }
  }

  // Generate Daily Status Report (WhatsApp / Slack / Email formatted)
  generateDailyReportText(dateStr = WorksheetManager.getTodayStr(), format = 'standard') {
    const entries = this.manager.entries.filter(e => e.date === dateStr);
    const metrics = this.manager.getMetrics(entries);
    const formattedDate = UIRenderer.formatDisplayDate(dateStr);
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const authorName = currentUser ? currentUser.name : 'Kavin';

    if (entries.length === 0) {
      return `📅 Daily Status Report - ${formattedDate}\n👤 ${authorName}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\nNo tasks recorded for this date.`;
    }

    let report = '';
    if (format === 'standard') {
      report += `📋 *DAILY WORK LOG REPORT*\n`;
      report += `👤 *Name:* ${authorName}\n`;
      report += `📅 *Date:* ${formattedDate}\n`;
      report += `⏱️ *Total Hours:* ${metrics.totalHours} hrs\n`;
      report += `✅ *Completed:* ${metrics.completed} | 🔄 *In Progress:* ${metrics.inProgress} | ⏳ *Pending:* ${metrics.pending}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      entries.forEach((e, idx) => {
        report += `${idx + 1}. *[${e.projectName}]* (${e.status} - ${e.hoursWorked}h)\n`;
        report += `   • ${e.work.replace(/\n/g, '\n   • ')}\n`;
        if (e.remarks) report += `   💬 _Remarks: ${e.remarks}_\n`;
        report += `\n`;
      });
    } else if (format === 'compact') {
      report += `*${authorName} - ${formattedDate} (${metrics.totalHours}h)*\n`;
      entries.forEach(e => {
        report += `• [${e.projectName}] ${e.work} (${e.status})\n`;
      });
    } else if (format === 'bullets') {
      report += `*Work Update - ${formattedDate}*\n`;
      report += `*Tasks Completed:*\n`;
      const done = entries.filter(e => e.status === 'Completed');
      if (done.length > 0) {
        done.forEach(e => report += `  ✓ [${e.projectName}] ${e.work} (${e.hoursWorked}h)\n`);
      } else {
        report += `  - None\n`;
      }

      report += `\n*In Progress / Pending:*\n`;
      const ongoing = entries.filter(e => e.status !== 'Completed');
      if (ongoing.length > 0) {
        ongoing.forEach(e => report += `  ⏳ [${e.projectName}] ${e.work} (${e.status})\n`);
      } else {
        report += `  - All tasks completed!\n`;
      }
    }

    return report;
  }
}

window.ImportExportManager = ImportExportManager;
