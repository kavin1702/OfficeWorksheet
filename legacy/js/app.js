/**
 * WorkPulse - Master Application Controller
 * Wires together state, UI renderer, cloud sync, modals, and user interactions.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Core Services
  const cloud = window.cloudStorage;
  const manager = new window.WorksheetManager(cloud);
  const ui = window.uiRenderer;
  const ie = new window.ImportExportManager(manager, ui);

  let currentView = 'table'; // 'table' | 'cards' | 'calendar' | 'analytics'
  let reportSelectedDate = WorksheetManager.getTodayStr();
  let reportSelectedFormat = 'standard';

  // Calendar State
  let calendarYear = 2026;
  let calendarMonth = 7; // August (0-indexed)
  let calendarSelectedDate = '2026-08-06';

  // 2. Initialize Theme
  initTheme();

  // 3. Initialize Cloud Sync Status Listener & Real-time Remote Sync
  cloud.onStatusChange((status, message) => {
    updateCloudStatusBadge(status, message);
  });

  // Automatically update laptop screen in real-time when changes are made on mobile phone
  cloud.onDataChange(async () => {
    await manager.initialize();
    renderApp();
  });

  // 4. Load Data & Render
  await manager.initialize();
  renderApp();

  // 5. Setup UI Event Listeners
  bindHeaderEvents();
  bindFilterEvents();
  bindViewSwitching();
  bindCalendarEvents();
  bindWorkModalEvents();
  bindCloudModalEvents();
  bindImportExportEvents();
  bindDailyReportEvents();
  bindKeyboardShortcuts();

  // -------------------------------------------------------------
  // Master Render Function
  // -------------------------------------------------------------
  function renderApp() {
    const entries = manager.getFilteredEntries();
    const metrics = manager.getMetrics(entries);
    const projects = manager.getUniqueProjects();

    // Context label for metrics
    let dateContext = 'Filtered';
    if (manager.filters.dateRange === 'today') dateContext = "Today's Status";
    else if (manager.filters.dateRange === 'yesterday') dateContext = "Yesterday";
    else if (manager.filters.dateRange === 'this-week') dateContext = "This Week";
    else if (manager.filters.dateRange === 'this-month') dateContext = "This Month";
    else if (manager.filters.dateRange === 'all') dateContext = "All Records";

    // Update Metrics
    ui.renderMetrics(metrics, dateContext);

    // Update Projects Dropdown
    ui.populateProjectFilters(projects, manager.filters.project);

    // Render Table View
    ui.renderTable(
      entries,
      handleStatusChange,
      handleEditEntry,
      handleDuplicateEntry,
      handleDeleteEntry
    );

    // Render Mobile Cards View
    ui.renderCards(
      entries,
      handleStatusChange,
      handleEditEntry,
      handleDuplicateEntry,
      handleDeleteEntry
    );

    // Render Calendar View
    if (currentView === 'calendar') {
      renderCalendarView();
    }

    // Render Charts
    if (currentView === 'analytics') {
      ui.renderCharts(metrics);
    }

    // Update Date Header
    const headerToday = document.getElementById('headerTodayText');
    if (headerToday) {
      headerToday.textContent = UIRenderer.formatDisplayDate(WorksheetManager.getTodayStr());
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // -------------------------------------------------------------
  // CRUD Action Handlers
  // -------------------------------------------------------------
  async function handleStatusChange(id, newStatus) {
    try {
      await manager.updateStatus(id, newStatus);
      if (newStatus === 'Completed') {
        ui.showToast('Task marked as Completed! Great job! 🎉', 'success');
        ui.triggerConfetti();
      } else {
        ui.showToast(`Status updated to ${newStatus}`, 'info');
      }
      renderApp();
    } catch (err) {
      ui.showToast('Failed to update status: ' + err.message, 'error');
    }
  }

  function handleEditEntry(entry) {
    openWorkModal(entry);
  }

  async function handleDuplicateEntry(id) {
    try {
      const cloned = await manager.duplicateEntry(id);
      if (cloned) {
        ui.showToast('Task duplicated into today\'s log!', 'success');
        renderApp();
      }
    } catch (err) {
      ui.showToast('Failed to duplicate task: ' + err.message, 'error');
    }
  }

  async function handleDeleteEntry(id) {
    if (confirm('Are you sure you want to delete this worksheet entry?')) {
      try {
        await manager.deleteEntry(id);
        ui.showToast('Work entry deleted.', 'info');
        renderApp();
      } catch (err) {
        ui.showToast('Failed to delete: ' + err.message, 'error');
      }
    }
  }

  // -------------------------------------------------------------
  // Header Events & Theme
  // -------------------------------------------------------------
  function bindHeaderEvents() {
    // Theme Toggle
    const themeBtn = document.getElementById('btnToggleTheme');
    themeBtn.addEventListener('click', toggleTheme);

    // Top buttons
    document.getElementById('btnNewWorksheetEntry').addEventListener('click', () => openWorkModal());
    document.getElementById('btnOpenReport').addEventListener('click', openDailyReportModal);
    document.getElementById('btnOpenImportExport').addEventListener('click', openImportExportModal);
    document.getElementById('btnOpenCloudModal').addEventListener('click', openCloudModal);
    document.getElementById('btnCloudStatus').addEventListener('click', openCloudModal);

    // Sync Now button
    const syncBtn = document.getElementById('btnSyncNow');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        const syncIcon = document.getElementById('syncIcon');
        if (syncIcon) syncIcon.style.animation = 'pulse 0.8s infinite alternate';
        try {
          ui.showToast('Checking online cloud database...', 'info');
          await manager.initialize();
          renderApp();
          ui.showToast('Cloud sync complete! Up to date.', 'success');
        } catch (err) {
          ui.showToast('Sync error: ' + err.message, 'error');
        } finally {
          if (syncIcon) setTimeout(() => { syncIcon.style.animation = ''; }, 600);
        }
      });
    }

    // Mobile FAB & Bottom Nav
    document.getElementById('mobileFabAdd').addEventListener('click', () => openWorkModal());
    document.getElementById('mobNavAdd').addEventListener('click', () => openWorkModal());
    document.getElementById('mobNavCloud').addEventListener('click', openCloudModal);
    document.getElementById('mobNavAnalytics').addEventListener('click', () => switchView('analytics'));
    
    const mobCal = document.getElementById('mobNavCalendar');
    if (mobCal) {
      mobCal.addEventListener('click', () => switchView('calendar'));
    }

    // Mobile date tabs
    document.querySelectorAll('.mob-nav-item[data-mob-filter]').forEach(item => {
      item.addEventListener('click', (e) => {
        const filterVal = item.dataset.mobFilter;
        document.querySelectorAll('.mob-nav-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Sync desktop pill
        manager.setFilter('dateRange', filterVal);
        updateDatePillsUI(filterVal);
        switchView('cards');
        renderApp();
      });
    });

    // Empty state buttons
    document.getElementById('btnEmptyAdd').addEventListener('click', () => openWorkModal());
    document.getElementById('btnLoadSampleData').addEventListener('click', async () => {
      if (window.SAMPLE_WORKSHEET_DATA) {
        await manager.storage.batchImport(window.SAMPLE_WORKSHEET_DATA);
        await manager.initialize();
        ui.showToast('Sample office data loaded!', 'success');
        renderApp();
      }
    });
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('workpulse_theme') || 'theme-light';
    document.body.className = savedTheme;
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    const newTheme = isDark ? 'theme-light' : 'theme-dark';
    document.body.className = newTheme;
    localStorage.setItem('workpulse_theme', newTheme);
    updateThemeIcon(newTheme);
    renderApp();
  }

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'theme-dark' ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function updateCloudStatusBadge(status, message) {
    const pill = document.getElementById('btnCloudStatus');
    const label = document.getElementById('cloudStatusText');
    if (!pill || !label) return;

    pill.className = `cloud-status-pill ${status}`;
    label.textContent = message;
  }

  // -------------------------------------------------------------
  // Filter & Search Events
  // -------------------------------------------------------------
  function bindFilterEvents() {
    // Date Pills
    const datePills = document.querySelectorAll('.filter-pill[data-date-filter]');
    datePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const filterType = pill.dataset.dateFilter;
        
        if (filterType === 'custom') {
          document.getElementById('customDateContainer').classList.remove('hidden');
          return;
        }

        document.getElementById('customDateContainer').classList.add('hidden');
        manager.setFilter('dateRange', filterType);
        updateDatePillsUI(filterType);
        renderApp();
      });
    });

    // Custom Date Range
    const customContainer = document.getElementById('customDateContainer');
    document.getElementById('btnApplyCustomDate').addEventListener('click', () => {
      const start = document.getElementById('filterStartDate').value;
      const end = document.getElementById('filterEndDate').value;
      if (!start || !end) {
        ui.showToast('Please select both Start Date and End Date', 'error');
        return;
      }
      manager.setFilter('dateRange', 'custom');
      manager.setFilter('customStartDate', start);
      manager.setFilter('customEndDate', end);
      updateDatePillsUI('custom');
      renderApp();
    });

    document.getElementById('btnCloseCustomDate').addEventListener('click', () => {
      customContainer.classList.add('hidden');
      manager.setFilter('dateRange', 'today');
      updateDatePillsUI('today');
      renderApp();
    });

    // Search Input
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      manager.setFilter('search', val);
      btnClearSearch.classList.toggle('hidden', !val);
      renderApp();
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      manager.setFilter('search', '');
      btnClearSearch.classList.add('hidden');
      renderApp();
    });

    // Project Dropdown
    document.getElementById('filterProject').addEventListener('change', (e) => {
      manager.setFilter('project', e.target.value);
      renderApp();
    });

    // Status Dropdown
    document.getElementById('filterStatus').addEventListener('change', (e) => {
      manager.setFilter('status', e.target.value);
      renderApp();
    });

    // Sorting headers
    document.querySelectorAll('.worksheet-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        manager.setSort(field);
        renderApp();
      });
    });

    // Carry Forward Pending Tasks Button
    document.getElementById('btnCarryForward').addEventListener('click', async () => {
      const res = await manager.carryForwardPendingTasks();
      if (res.count > 0) {
        ui.showToast(res.message, 'success');
        manager.setFilter('dateRange', 'today');
        updateDatePillsUI('today');
        renderApp();
      } else {
        ui.showToast(res.message, 'info');
      }
    });
  }

  function updateDatePillsUI(activeFilter) {
    document.querySelectorAll('.filter-pill[data-date-filter]').forEach(p => {
      p.classList.toggle('active', p.dataset.dateFilter === activeFilter);
    });
  }

  // -------------------------------------------------------------
  // View Switcher (Table / Cards / Calendar / Analytics)
  // -------------------------------------------------------------
  function bindViewSwitching() {
    document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
      });
    });
  }

  function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.view-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === viewName);
    });

    document.getElementById('tableViewContainer').classList.toggle('hidden', viewName !== 'table');
    document.getElementById('cardsViewContainer').classList.toggle('hidden', viewName !== 'cards');
    document.getElementById('calendarViewContainer').classList.toggle('hidden', viewName !== 'calendar');
    document.getElementById('analyticsViewContainer').classList.toggle('hidden', viewName !== 'analytics');

    if (viewName === 'calendar') {
      renderCalendarView();
    } else if (viewName === 'analytics') {
      const entries = manager.getFilteredEntries();
      const metrics = manager.getMetrics(entries);
      ui.renderCharts(metrics);
    }
  }

  // -------------------------------------------------------------
  // Calendar Events & Render
  // -------------------------------------------------------------
  function bindCalendarEvents() {
    const btnPrev = document.getElementById('btnPrevMonth');
    const btnNext = document.getElementById('btnNextMonth');
    const btnToday = document.getElementById('btnCalendarToday');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        calendarMonth--;
        if (calendarMonth < 0) {
          calendarMonth = 11;
          calendarYear--;
        }
        renderCalendarView();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        calendarMonth++;
        if (calendarMonth > 11) {
          calendarMonth = 0;
          calendarYear++;
        }
        renderCalendarView();
      });
    }

    if (btnToday) {
      btnToday.addEventListener('click', () => {
        const d = new Date();
        calendarYear = d.getFullYear();
        calendarMonth = d.getMonth();
        calendarSelectedDate = WorksheetManager.getTodayStr();
        renderCalendarView();
      });
    }
  }

  function renderCalendarView() {
    ui.renderCalendar(
      calendarYear,
      calendarMonth,
      manager,
      calendarSelectedDate,
      (clickedDate) => {
        calendarSelectedDate = clickedDate;
        renderCalendarView();
      },
      (dateToLog) => {
        openWorkModal(null, dateToLog);
      },
      handleStatusChange,
      handleEditEntry,
      handleDuplicateEntry,
      handleDeleteEntry
    );
  }

  // -------------------------------------------------------------
  // Add / Edit Work Modal
  // -------------------------------------------------------------
  function openWorkModal(existingEntry = null, defaultDate = null) {
    const modal = document.getElementById('workModal');
    const form = document.getElementById('workEntryForm');
    const title = document.getElementById('workModalTitle');
    const saveBtnText = document.getElementById('saveBtnText');

    form.reset();

    if (existingEntry) {
      title.textContent = 'Edit Work Log';
      saveBtnText.textContent = 'Update Log';
      document.getElementById('workEntryId').value = existingEntry.id;
      document.getElementById('workDate').value = existingEntry.date;
      document.getElementById('projectNameInput').value = existingEntry.projectName;
      document.getElementById('workDescription').value = existingEntry.work;
      document.getElementById('workStatus').value = existingEntry.status;
      document.getElementById('workHours').value = existingEntry.hoursWorked || '';
      document.getElementById('workPriority').value = existingEntry.priority || 'Medium';
      document.getElementById('workRemarks').value = existingEntry.remarks || '';
    } else {
      title.textContent = 'Log Daily Work';
      saveBtnText.textContent = 'Save Work Log';
      document.getElementById('workEntryId').value = '';
      document.getElementById('workDate').value = defaultDate || WorksheetManager.getTodayStr();
      document.getElementById('workStatus').value = 'In Progress';
      document.getElementById('workPriority').value = 'Medium';
    }

    // Setup project suggestions dropdown
    setupProjectAutocomplete();

    modal.classList.remove('hidden');
    document.getElementById('projectNameInput').focus();
  }

  function closeWorkModal() {
    document.getElementById('workModal').classList.add('hidden');
  }

  function bindWorkModalEvents() {
    document.getElementById('btnCloseWorkModal').addEventListener('click', closeWorkModal);
    document.getElementById('btnCancelWorkModal').addEventListener('click', closeWorkModal);

    // Quick Date Chips in modal
    document.getElementById('chipToday').addEventListener('click', () => {
      document.getElementById('workDate').value = WorksheetManager.getTodayStr();
    });

    document.getElementById('chipYesterday').addEventListener('click', () => {
      document.getElementById('workDate').value = WorksheetManager.getYesterdayStr();
    });

    // Save Form Submission
    document.getElementById('workEntryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('workEntryId').value;
      const formData = {
        date: document.getElementById('workDate').value,
        projectName: document.getElementById('projectNameInput').value,
        work: document.getElementById('workDescription').value,
        status: document.getElementById('workStatus').value,
        hoursWorked: document.getElementById('workHours').value,
        priority: document.getElementById('workPriority').value,
        remarks: document.getElementById('workRemarks').value
      };

      try {
        if (id) {
          await manager.updateEntry(id, formData);
          ui.showToast('Work log updated successfully!', 'success');
        } else {
          await manager.addEntry(formData);
          ui.showToast('New daily work log added!', 'success');
          if (formData.status === 'Completed') ui.triggerConfetti();
        }

        closeWorkModal();
        renderApp();
      } catch (err) {
        ui.showToast('Error saving log: ' + err.message, 'error');
      }
    });
  }

  function setupProjectAutocomplete() {
    const input = document.getElementById('projectNameInput');
    const dropdown = document.getElementById('projectSuggestions');
    const projects = manager.getUniqueProjects();

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q) {
        dropdown.classList.add('hidden');
        return;
      }

      const matches = projects.filter(p => p.toLowerCase().includes(q));
      if (matches.length === 0) {
        dropdown.classList.add('hidden');
        return;
      }

      dropdown.innerHTML = '';
      matches.forEach(p => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = p;
        item.addEventListener('click', () => {
          input.value = p;
          dropdown.classList.add('hidden');
        });
        dropdown.appendChild(item);
      });
      dropdown.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // -------------------------------------------------------------
  // Cloud Database Settings Modal
  // -------------------------------------------------------------
  function openCloudModal() {
    const modal = document.getElementById('cloudModal');
    const config = cloud.config;

    // Fill form
    document.querySelectorAll('input[name="storageProvider"]').forEach(radio => {
      radio.checked = radio.value === config.provider;
      radio.closest('.mode-card').classList.toggle('active', radio.value === config.provider);
    });

    document.getElementById('syncKeyInput').value = config.syncKey || '';
    document.getElementById('supabaseUrl').value = config.supabaseUrl || '';
    document.getElementById('supabaseAnonKey').value = config.supabaseAnonKey || '';
    document.getElementById('restApiUrl').value = config.restApiUrl || '';
    document.getElementById('restAuthToken').value = config.restAuthToken || '';

    updateCloudConfigUI(config.provider);
    document.getElementById('cloudTestResult').classList.add('hidden');

    modal.classList.remove('hidden');
  }

  function closeCloudModal() {
    document.getElementById('cloudModal').classList.add('hidden');
  }

  function updateCloudConfigUI(provider) {
    const instantSec = document.getElementById('instantConfigSection');
    const supabaseSec = document.getElementById('supabaseConfigSection');
    const restSec = document.getElementById('restConfigSection');

    if (instantSec) instantSec.classList.toggle('hidden', provider !== 'instant');
    if (supabaseSec) supabaseSec.classList.toggle('hidden', provider !== 'supabase');
    if (restSec) restSec.classList.toggle('hidden', provider !== 'rest');
  }

  function bindCloudModalEvents() {
    document.getElementById('btnCloseCloudModal').addEventListener('click', closeCloudModal);

    // Generate random sync key button
    const genBtn = document.getElementById('btnGenerateSyncKey');
    if (genBtn) {
      genBtn.addEventListener('click', () => {
        const rand = 'office-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
        document.getElementById('syncKeyInput').value = rand;
      });
    }

    // Provider radio switch
    document.querySelectorAll('input[name="storageProvider"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.mode-card').classList.add('active');
        updateCloudConfigUI(e.target.value);
      });
    });

    // Test Connection button
    document.getElementById('btnTestCloudConnection').addEventListener('click', async () => {
      const resultBox = document.getElementById('cloudTestResult');
      resultBox.className = 'test-result-box';
      resultBox.textContent = 'Testing connection to cloud...';
      resultBox.classList.remove('hidden');

      const activeProvider = document.querySelector('input[name="storageProvider"]:checked').value;
      const testConfig = {
        provider: activeProvider,
        syncKey: document.getElementById('syncKeyInput').value,
        supabaseUrl: document.getElementById('supabaseUrl').value,
        supabaseAnonKey: document.getElementById('supabaseAnonKey').value,
        restApiUrl: document.getElementById('restApiUrl').value,
        restAuthToken: document.getElementById('restAuthToken').value
      };

      try {
        const res = await cloud.testConnection(testConfig);
        resultBox.classList.add('success');
        resultBox.textContent = '✅ ' + res.message;
      } catch (err) {
        resultBox.classList.add('error');
        resultBox.textContent = '❌ Connection Failed: ' + err.message;
      }
    });

    // Save Cloud Settings
    document.getElementById('btnSaveCloudSettings').addEventListener('click', async () => {
      const activeProvider = document.querySelector('input[name="storageProvider"]:checked').value;
      const newConfig = {
        provider: activeProvider,
        syncKey: document.getElementById('syncKeyInput').value,
        supabaseUrl: document.getElementById('supabaseUrl').value,
        supabaseAnonKey: document.getElementById('supabaseAnonKey').value,
        restApiUrl: document.getElementById('restApiUrl').value,
        restAuthToken: document.getElementById('restAuthToken').value
      };

      cloud.saveConfig(newConfig);
      ui.showToast('Cloud sync settings saved!', 'success');
      closeCloudModal();

      // Immediately sync current records to cloud and reload
      ui.showToast('Uploading & synchronizing records with cloud...', 'info');
      await cloud.batchImport(manager.entries);
      await manager.initialize();
      renderApp();
      ui.showToast('Cloud database synchronized successfully!', 'success');
    });

    // Copy SQL Script Button
    document.getElementById('btnCopySql').addEventListener('click', () => {
      const sql = `-- Create office daily worksheet table
CREATE TABLE IF NOT EXISTS daily_worksheets (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  project_name TEXT NOT NULL,
  work TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Progress',
  hours_worked NUMERIC DEFAULT 0,
  priority TEXT DEFAULT 'Medium',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security & Public Access
ALTER TABLE daily_worksheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all access" ON daily_worksheets FOR ALL USING (true) WITH CHECK (true);`;

      navigator.clipboard.writeText(sql).then(() => {
        ui.showToast('SQL setup script copied to clipboard!', 'success');
      });
    });
  }

  // -------------------------------------------------------------
  // Import & Export Modal
  // -------------------------------------------------------------
  function openImportExportModal() {
    document.getElementById('importExportModal').classList.remove('hidden');
  }

  function closeImportExportModal() {
    document.getElementById('importExportModal').classList.add('hidden');
  }

  function bindImportExportEvents() {
    document.getElementById('btnCloseIEModal').addEventListener('click', closeImportExportModal);
    document.getElementById('btnCloseIEFooter').addEventListener('click', closeImportExportModal);

    // Tab switching
    document.querySelectorAll('.ie-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabType = tab.dataset.ietab;
        document.querySelectorAll('.ie-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.getElementById('tabExportContent').classList.toggle('hidden', tabType !== 'export');
        document.getElementById('tabImportContent').classList.toggle('hidden', tabType !== 'import');
      });
    });

    // Export Handlers
    document.getElementById('btnExportExcel').addEventListener('click', () => ie.exportToExcel());
    document.getElementById('btnExportCsv').addEventListener('click', () => ie.exportToCsv());
    document.getElementById('btnExportJson').addEventListener('click', () => ie.exportToJson());
    document.getElementById('btnPrintWorksheet').addEventListener('click', () => ie.printWorksheet());

    // Import Handlers
    const dropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('importFileInput');
    const btnBrowse = document.getElementById('btnBrowseFile');

    btnBrowse.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
      if (e.target !== btnBrowse) fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        ie.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        ie.handleFileUpload(e.target.files[0]);
      }
    });

    document.getElementById('btnConfirmImport').addEventListener('click', async () => {
      await ie.confirmImport();
      closeImportExportModal();
      renderApp();
    });
  }

  // -------------------------------------------------------------
  // Daily Status Report Modal (WhatsApp / Slack / Email)
  // -------------------------------------------------------------
  function openDailyReportModal() {
    const modal = document.getElementById('reportModal');
    const dateSelect = document.getElementById('reportDateSelect');
    const dates = manager.getUniqueDates();

    dateSelect.innerHTML = '';
    const todayStr = WorksheetManager.getTodayStr();
    
    // Add today if not present
    if (!dates.includes(todayStr)) {
      const opt = document.createElement('option');
      opt.value = todayStr;
      opt.textContent = `Today (${UIRenderer.formatDisplayDate(todayStr)})`;
      dateSelect.appendChild(opt);
    }

    dates.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = UIRenderer.formatDisplayDate(d);
      if (d === reportSelectedDate) opt.selected = true;
      dateSelect.appendChild(opt);
    });

    updateDailyReportPreview();
    modal.classList.remove('hidden');
  }

  function closeDailyReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
  }

  function updateDailyReportPreview() {
    const text = ie.generateDailyReportText(reportSelectedDate, reportSelectedFormat);
    document.getElementById('dailyReportText').value = text;
  }

  function bindDailyReportEvents() {
    document.getElementById('btnCloseReportModal').addEventListener('click', closeDailyReportModal);
    document.getElementById('btnCloseReportFooter').addEventListener('click', closeDailyReportModal);

    document.getElementById('reportDateSelect').addEventListener('change', (e) => {
      reportSelectedDate = e.target.value;
      updateDailyReportPreview();
    });

    // Format buttons
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        reportSelectedFormat = btn.dataset.format;
        updateDailyReportPreview();
      });
    });

    // Copy to clipboard
    document.getElementById('btnCopyDailyReport').addEventListener('click', () => {
      const text = document.getElementById('dailyReportText').value;
      navigator.clipboard.writeText(text).then(() => {
        ui.showToast('Daily Report copied to clipboard! Ready to paste.', 'success');
      }).catch(err => {
        ui.showToast('Failed to copy text', 'error');
      });
    });
  }

  // -------------------------------------------------------------
  // Keyboard Shortcuts
  // -------------------------------------------------------------
  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape closes any open modal
      if (e.key === 'Escape') {
        closeWorkModal();
        closeCloudModal();
        closeImportExportModal();
        closeDailyReportModal();
      }

      // Ctrl + N or Cmd + N for new entry
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openWorkModal();
      }
    });
  }
});
