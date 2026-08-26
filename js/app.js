/**
 * WorkPulse - Master Application Controller
 * Wires together state, UI renderer, cloud sync, modals, and user interactions.
 */

async function initWorkPulseApp() {
  // 1. Initialize Core Services
  const auth = window.authManager;
  const cloud = window.cloudStorage || new window.CloudStorage();
  const manager = new window.WorksheetManager(cloud);
  const ui = window.uiRenderer || new window.UIRenderer();
  const ie = new window.ImportExportManager(manager, ui);
  const admin = new window.AdminManager(manager, auth, ui);

  let currentView = 'table'; // 'table' | 'cards' | 'calendar' | 'analytics'
  let reportSelectedDate = WorksheetManager.getTodayStr();
  let reportSelectedFormat = 'standard';

  // Calendar State
  let calendarYear = 2026;
  let calendarMonth = 7; // August (0-indexed)
  let calendarSelectedDate = '2026-08-06';

  // Expose window.workPulseApp actions for zero-lag direct HTML click handlers
  window.workPulseApp = {
    openWorkModal: (existing, defDate) => openWorkModal(existing, defDate),
    closeWorkModal: () => closeWorkModal(),
    openReport: () => openDailyReportModal(),
    closeReport: () => closeDailyReportModal(),
    openImportExport: () => openImportExportModal(),
    closeImportExport: () => closeImportExportModal(),
    openCloud: () => openCloudModal(),
    closeCloud: () => closeCloudModal(),
    switchView: (v) => switchView(v),
    setDateFilter: (filterType) => {
      if (filterType === 'custom') {
        const c = document.getElementById('customDateContainer');
        if (c) c.classList.remove('hidden');
        return;
      }
      const c = document.getElementById('customDateContainer');
      if (c) c.classList.add('hidden');
      manager.setFilter('dateRange', filterType);
      updateDatePillsUI(filterType);
      renderApp();
    },
    setUserScope: (scope) => {
      manager.setFilter('userScope', scope);
      const pillMe = document.getElementById('btnUserScopeSelf');
      const pillAll = document.getElementById('btnUserScopeAll');
      if (pillMe) pillMe.classList.toggle('active', scope === 'me');
      if (pillAll) pillAll.classList.toggle('active', scope === 'all');
      renderApp();
    },
    carryForward: async () => {
      const res = await manager.carryForwardPendingTasks();
      if (res.count > 0) {
        ui.showToast(res.message, 'success');
        manager.setFilter('dateRange', 'today');
        updateDatePillsUI('today');
        renderApp();
      } else {
        ui.showToast(res.message, 'info');
      }
    }
  };

  // 2. Initialize Theme
  initTheme();

  // 3. User Authentication Gatekeeper & Session Listener
  const authPortal = document.getElementById('authPortal');
  const appContainer = document.getElementById('app');

  // Expose global login handlers for immediate zero-lag execution
  window.handleQuickLogin = function(email) {
    try {
      const logged = auth.login(email, 'password123');
      ui.showToast(`Welcome back, ${logged.name}!`, 'success');
      updateAuthGate();
    } catch (err) {
      ui.showToast(err.message, 'error');
    }
  };

  window.handlePortalSignIn = function(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById('portalSignInEmail');
    const passInput = document.getElementById('portalSignInPassword');
    const email = emailInput ? emailInput.value : '';
    const password = passInput ? passInput.value : 'password123';
    try {
      const logged = auth.login(email, password);
      ui.showToast(`Welcome back, ${logged.name}!`, 'success');
      updateAuthGate();
    } catch (err) {
      const alertBox = document.getElementById('authPortalAlert');
      const alertText = document.getElementById('authPortalAlertText');
      if (alertText) alertText.textContent = err.message;
      if (alertBox) alertBox.classList.remove('hidden');
      ui.showToast(err.message, 'error');
    }
    return false;
  };

  window.workPulseUpdateAuthGate = updateAuthGate;

  function updateAuthGate() {
    const loggedIn = auth ? auth.isLoggedIn() : true;
    if (loggedIn) {
      if (authPortal) authPortal.classList.add('hidden');
      if (appContainer) appContainer.classList.remove('hidden');

      // Smart Role-Based Default View
      const currentUser = auth.getCurrentUser();
      const isAdmin = auth.isAdmin(currentUser);

      // Default date filter to 'this-month' so all past August tasks are immediately visible
      manager.setFilter('dateRange', 'this-month');
      updateDatePillsUI('this-month');

      if (isAdmin) {
        manager.setFilter('userScope', 'all');
        const pillScopeAll = document.getElementById('btnUserScopeAll');
        const pillScopeMe = document.getElementById('btnUserScopeSelf');
        if (pillScopeAll) pillScopeAll.classList.add('active');
        if (pillScopeMe) pillScopeMe.classList.remove('active');
      } else {
        manager.setFilter('userScope', 'me');
        const pillScopeMe = document.getElementById('btnUserScopeSelf');
        const pillScopeAll = document.getElementById('btnUserScopeAll');
        if (pillScopeMe) pillScopeMe.classList.add('active');
        if (pillScopeAll) pillScopeAll.classList.remove('active');
      }

      renderApp();
    } else {
      if (authPortal) authPortal.classList.remove('hidden');
      if (appContainer) appContainer.classList.add('hidden');
      renderPortalUsers();
    }
  }

  if (auth) {
    auth.onUserChange(({ event, user }) => {
      updateAuthGate();
    });
  }

  // 4. Setup UI Event Listeners IMMEDIATELY (with safe null checks)
  bindHeaderEvents();
  bindAuthEvents();
  bindAdminEvents();
  bindFilterEvents();
  bindViewSwitching();
  bindCalendarEvents();
  bindWorkModalEvents();
  bindCloudModalEvents();
  bindImportExportEvents();
  bindDailyReportEvents();
  bindKeyboardShortcuts();

  // 5. Initialize Cloud Sync Status Listener
  cloud.onStatusChange((status, message) => {
    updateCloudStatusBadge(status, message);
  });

  cloud.onDataChange(async () => {
    await manager.initialize();
    renderApp();
  });

  // 6. Initialize Gatekeeper UI
  updateAuthGate();

  // 7. Load Data in background
  try {
    await manager.initialize();
    renderApp();
  } catch (err) {
    console.warn('Initial data load notice:', err);
  }

  // =========================================================================
  // Master Render Function
  // =========================================================================
  function renderApp() {
    const currentUser = auth ? auth.getCurrentUser() : null;
    if (currentUser) {
      ui.renderUserProfileHeader(currentUser);
    }

    // Toggle Admin Panel button visibility (STRICT: ONLY for mnkavin2006@gmail.com)
    const btnOpenAdminPanel = document.getElementById('btnOpenAdminPanel');
    const btnDropdownAdmin = document.getElementById('btnDropdownAdmin');
    const isAdmin = auth ? auth.isAdmin() : false;

    if (btnOpenAdminPanel) {
      btnOpenAdminPanel.style.setProperty('display', isAdmin ? 'inline-flex' : 'none', 'important');
      btnOpenAdminPanel.classList.toggle('hidden', !isAdmin);
    }
    if (btnDropdownAdmin) {
      btnDropdownAdmin.style.setProperty('display', isAdmin ? 'flex' : 'none', 'important');
      btnDropdownAdmin.classList.toggle('hidden', !isAdmin);
    }

    const entries = manager.getFilteredEntries();
    const metrics = manager.getMetrics(entries);
    const projects = manager.getUniqueProjects();
    const showUserBadge = manager.filters.userScope === 'all';

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
      handleDeleteEntry,
      showUserBadge
    );

    // Render Mobile Cards View
    ui.renderCards(
      entries,
      handleStatusChange,
      handleEditEntry,
      handleDuplicateEntry,
      handleDeleteEntry,
      showUserBadge
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

  // =========================================================================
  // Handlers for Worksheet Items (Edit, Delete, Status Change)
  // =========================================================================
  async function handleStatusChange(id, newStatus) {
    try {
      await manager.updateStatus(id, newStatus);
      ui.showToast(`Status updated to ${newStatus}`, 'success');
      if (newStatus === 'Completed') {
        ui.triggerConfetti();
      }
      renderApp();
    } catch (err) {
      ui.showToast('Failed to update status', 'error');
    }
  }

  function handleEditEntry(entry) {
    openWorkModal(entry);
  }

  async function handleDuplicateEntry(id) {
    try {
      const cloned = await manager.duplicateEntry(id);
      ui.showToast('Entry duplicated to today\'s worksheet!', 'success');
      renderApp();
    } catch (err) {
      ui.showToast('Failed to duplicate: ' + err.message, 'error');
    }
  }

  async function handleDeleteEntry(id) {
    if (!confirm('Are you sure you want to delete this work log?')) return;
    try {
      await manager.deleteEntry(id);
      ui.showToast('Work log deleted', 'info');
      renderApp();
    } catch (err) {
      ui.showToast('Failed to delete entry', 'error');
    }
  }

  // =========================================================================
  // UI Event Bindings with Defensive Null-Checks
  // =========================================================================
  function bindHeaderEvents() {
    const themeBtn = document.getElementById('btnToggleTheme');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const btnNew = document.getElementById('btnNewWorksheetEntry');
    if (btnNew) btnNew.addEventListener('click', () => openWorkModal());

    const btnRep = document.getElementById('btnOpenReport');
    if (btnRep) btnRep.addEventListener('click', openDailyReportModal);

    const btnIE = document.getElementById('btnOpenImportExport');
    if (btnIE) btnIE.addEventListener('click', openImportExportModal);

    const btnCloud = document.getElementById('btnOpenCloudModal');
    if (btnCloud) btnCloud.addEventListener('click', openCloudModal);

    const btnCloudSt = document.getElementById('btnCloudStatus');
    if (btnCloudSt) btnCloudSt.addEventListener('click', openCloudModal);

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
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('workpulse_theme') || '';
    if (savedTheme) {
      document.body.className = savedTheme;
    }
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

  function bindFilterEvents() {
    // Scope pills
    const scopePills = document.querySelectorAll('.filter-pill[data-user-scope]');
    scopePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const scope = pill.dataset.userScope;
        scopePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        manager.setFilter('userScope', scope);
        renderApp();
      });
    });

    // Date pills (supports data-date-filter and data-range)
    const datePills = document.querySelectorAll('.filter-pill[data-date-filter], .filter-pill[data-range]');
    datePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const filterType = pill.dataset.dateFilter || pill.dataset.range;
        if (!filterType) return;
        
        if (filterType === 'custom') {
          const c = document.getElementById('customDateContainer');
          if (c) c.classList.remove('hidden');
          return;
        }

        const c = document.getElementById('customDateContainer');
        if (c) c.classList.add('hidden');
        manager.setFilter('dateRange', filterType);
        updateDatePillsUI(filterType);
        renderApp();
      });
    });

    // Search Input
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        manager.setFilter('search', val);
        if (btnClearSearch) btnClearSearch.classList.toggle('hidden', !val);
        renderApp();
      });
    }

    if (btnClearSearch && searchInput) {
      btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        manager.setFilter('search', '');
        btnClearSearch.classList.add('hidden');
        renderApp();
      });
    }

    // Project Dropdown
    const filterProj = document.getElementById('filterProject');
    if (filterProj) {
      filterProj.addEventListener('change', (e) => {
        manager.setFilter('project', e.target.value);
        renderApp();
      });
    }

    // Status Dropdown
    const filterStat = document.getElementById('filterStatus');
    if (filterStat) {
      filterStat.addEventListener('change', (e) => {
        manager.setFilter('status', e.target.value);
        renderApp();
      });
    }

    // Sorting headers
    document.querySelectorAll('.worksheet-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        manager.setSort(field);
        renderApp();
      });
    });

    // Carry Forward
    const btnCarry = document.getElementById('btnCarryForward');
    if (btnCarry) {
      btnCarry.addEventListener('click', async () => {
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
  }

  function updateDatePillsUI(activeFilter) {
    document.querySelectorAll('.filter-pill[data-date-filter], .filter-pill[data-range]').forEach(p => {
      const val = p.dataset.dateFilter || p.dataset.range;
      p.classList.toggle('active', val === activeFilter);
    });
  }

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

    const tableEl = document.getElementById('tableViewContainer');
    const cardsEl = document.getElementById('cardsViewContainer');
    const calEl = document.getElementById('calendarViewContainer');
    const chartEl = document.getElementById('analyticsViewContainer');

    if (tableEl) tableEl.classList.toggle('hidden', viewName !== 'table');
    if (cardsEl) cardsEl.classList.toggle('hidden', viewName !== 'cards');
    if (calEl) calEl.classList.toggle('hidden', viewName !== 'calendar');
    if (chartEl) chartEl.classList.toggle('hidden', viewName !== 'analytics');

    if (viewName === 'calendar') {
      renderCalendarView();
    } else if (viewName === 'analytics') {
      const entries = manager.getFilteredEntries();
      const metrics = manager.getMetrics(entries);
      ui.renderCharts(metrics);
    }
  }

  function bindCalendarEvents() {
    const btnPrev = document.getElementById('btnCalPrev') || document.getElementById('btnPrevMonth');
    const btnNext = document.getElementById('btnCalNext') || document.getElementById('btnNextMonth');
    const btnToday = document.getElementById('btnCalToday') || document.getElementById('btnCalendarToday');

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

  function openWorkModal(existingEntry = null, defaultDate = null) {
    const modal = document.getElementById('workModal');
    const form = document.getElementById('workEntryForm');
    const title = document.getElementById('workModalTitle');
    const saveBtnText = document.getElementById('saveBtnText');

    if (form) form.reset();

    if (existingEntry) {
      if (title) title.textContent = 'Edit Work Log';
      if (saveBtnText) saveBtnText.textContent = 'Update Log';
      const idEl = document.getElementById('workEntryId');
      if (idEl) idEl.value = existingEntry.id;
      const dateEl = document.getElementById('workDate');
      if (dateEl) dateEl.value = existingEntry.date;
      const projEl = document.getElementById('projectNameInput');
      if (projEl) projEl.value = existingEntry.projectName;
      const descEl = document.getElementById('workDescription');
      if (descEl) descEl.value = existingEntry.work;
      const statEl = document.getElementById('workStatus');
      if (statEl) statEl.value = existingEntry.status;
      const hrsEl = document.getElementById('workHours');
      if (hrsEl) hrsEl.value = existingEntry.hoursWorked || '';
      const prioEl = document.getElementById('workPriority');
      if (prioEl) prioEl.value = existingEntry.priority || 'Medium';
      const remEl = document.getElementById('workRemarks');
      if (remEl) remEl.value = existingEntry.remarks || '';
    } else {
      if (title) title.textContent = 'Log Daily Work';
      if (saveBtnText) saveBtnText.textContent = 'Save Work Log';
      const idEl = document.getElementById('workEntryId');
      if (idEl) idEl.value = '';
      const dateEl = document.getElementById('workDate');
      if (dateEl) dateEl.value = defaultDate || WorksheetManager.getTodayStr();
      const statEl = document.getElementById('workStatus');
      if (statEl) statEl.value = 'In Progress';
      const prioEl = document.getElementById('workPriority');
      if (prioEl) prioEl.value = 'Medium';
    }

    setupProjectAutocomplete();
    if (modal) modal.classList.remove('hidden');
    const projEl = document.getElementById('projectNameInput');
    if (projEl) projEl.focus();
  }

  function closeWorkModal() {
    const modal = document.getElementById('workModal');
    if (modal) modal.classList.add('hidden');
  }

  function bindWorkModalEvents() {
    const btnClose = document.getElementById('btnCloseWorkModal');
    if (btnClose) btnClose.addEventListener('click', closeWorkModal);

    const btnCancel = document.getElementById('btnCancelWorkModal');
    if (btnCancel) btnCancel.addEventListener('click', closeWorkModal);

    const chipToday = document.getElementById('chipToday');
    if (chipToday) {
      chipToday.addEventListener('click', () => {
        const wDate = document.getElementById('workDate');
        if (wDate) wDate.value = WorksheetManager.getTodayStr();
      });
    }

    const chipYest = document.getElementById('chipYesterday');
    if (chipYest) {
      chipYest.addEventListener('click', () => {
        const wDate = document.getElementById('workDate');
        if (wDate) wDate.value = WorksheetManager.getYesterdayStr();
      });
    }

    document.querySelectorAll('.chip-past-date').forEach(chip => {
      chip.addEventListener('click', () => {
        const wDate = document.getElementById('workDate');
        if (wDate) wDate.value = chip.dataset.date;
      });
    });

    const workForm = document.getElementById('workEntryForm');
    if (workForm) {
      workForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('workEntryId').value;
        const chosenDate = document.getElementById('workDate').value || WorksheetManager.getTodayStr();
        const formData = {
          date: chosenDate,
          projectName: document.getElementById('projectNameInput').value,
          work: document.getElementById('workDescription').value,
          status: document.getElementById('workStatus').value,
          hoursWorked: parseFloat(document.getElementById('workHours').value) || 0,
          priority: document.getElementById('workPriority').value,
          remarks: document.getElementById('workRemarks').value
        };

        try {
          if (id) {
            await manager.updateEntry(id, formData);
            ui.showToast('Work log updated and synced to Google Sheets!', 'success');
          } else {
            await manager.addEntry(formData);
            ui.showToast(`Saved ${chosenDate} task & synced to Google Sheets!`, 'success');
            if (formData.status === 'Completed' && window.confetti) window.confetti();
          }

          const todayStr = WorksheetManager.getTodayStr();
          if (chosenDate !== todayStr && manager.filters.dateRange === 'today') {
            manager.setFilter('dateRange', 'this-month');
            updateDatePillsUI('this-month');
          }

          closeWorkModal();
          renderApp();
        } catch (err) {
          ui.showToast('Error saving log: ' + err.message, 'error');
        }
      });
    }
  }

  function setupProjectAutocomplete() {
    const input = document.getElementById('projectNameInput');
    const dropdown = document.getElementById('projectSuggestions');
    if (!input || !dropdown) return;
    const projects = manager.getUniqueProjects();

    function showSuggestions(val) {
      const q = (val || '').toLowerCase().trim();
      const matches = projects.filter(p => p.toLowerCase().includes(q));

      if (matches.length === 0) {
        dropdown.classList.add('hidden');
        return;
      }

      dropdown.innerHTML = matches.map(p => `
        <div class="autocomplete-item" data-val="${ui.escapeHtml(p)}">
          <span>${ui.escapeHtml(p)}</span>
        </div>
      `).join('');

      dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          input.value = item.dataset.val;
          dropdown.classList.add('hidden');
        });
      });

      dropdown.classList.remove('hidden');
    }

    input.addEventListener('input', () => showSuggestions(input.value));
    input.addEventListener('focus', () => showSuggestions(input.value));

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  function openCloudModal() {
    const modal = document.getElementById('cloudModal');
    const urlInput = document.getElementById('googleSheetUrl');
    const cfg = cloud.getConfig();
    if (urlInput && cfg.googleSheetUrl) {
      urlInput.value = cfg.googleSheetUrl;
    }
    if (modal) modal.classList.remove('hidden');
  }

  function closeCloudModal() {
    const modal = document.getElementById('cloudModal');
    if (modal) modal.classList.add('hidden');
  }

  function bindCloudModalEvents() {
    const closeBtn = document.getElementById('btnCloseCloudModal');
    if (closeBtn) closeBtn.addEventListener('click', closeCloudModal);

    const testBtn = document.getElementById('btnTestCloudConnection');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const resultBox = document.getElementById('cloudTestResult');
        if (resultBox) {
          resultBox.className = 'test-result-box';
          resultBox.textContent = 'Testing connection to Google Apps Script...';
          resultBox.classList.remove('hidden');
        }

        const sheetUrl = document.getElementById('googleSheetUrl').value;
        try {
          const res = await cloud.testConnection({ googleSheetUrl: sheetUrl });
          if (resultBox) {
            resultBox.classList.add('success');
            resultBox.textContent = res.message;
          }
        } catch (err) {
          if (resultBox) {
            resultBox.classList.add('error');
            resultBox.textContent = 'âŒ Connection Error: ' + err.message;
          }
        }
      });
    }

    const pushAllBtn = document.getElementById('btnPushAllToSheets');
    if (pushAllBtn) {
      pushAllBtn.addEventListener('click', async () => {
        ui.showToast('Pushing all worksheet records to Google Sheet...', 'info');
        await cloud.syncAllToGoogleSheets(manager.entries);
        ui.showToast('All data pushed to Google Sheet successfully!', 'success');
      });
    }
  }

  function openImportExportModal() {
    const modal = document.getElementById('importExportModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeImportExportModal() {
    const modal = document.getElementById('importExportModal');
    if (modal) modal.classList.add('hidden');
  }

  function bindImportExportEvents() {
    const closeBtn = document.getElementById('btnCloseIEModal');
    if (closeBtn) closeBtn.addEventListener('click', closeImportExportModal);

    const closeFooter = document.getElementById('btnCloseIEFooter');
    if (closeFooter) closeFooter.addEventListener('click', closeImportExportModal);

    const btnXlsx = document.getElementById('btnExportExcel');
    if (btnXlsx) btnXlsx.addEventListener('click', () => ie.exportToExcel());

    const btnCsv = document.getElementById('btnExportCSV') || document.getElementById('btnExportCsv');
    if (btnCsv) btnCsv.addEventListener('click', () => ie.exportToCsv());
  }

  function openDailyReportModal() {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    const previewEl = document.getElementById('dailyReportPreview');
    const text = ie.generateDailyReportText(reportSelectedDate, reportSelectedFormat);
    if (previewEl) previewEl.value = text;
    modal.classList.remove('hidden');
  }

  function closeDailyReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.classList.add('hidden');
  }

  function bindDailyReportEvents() {
    const closeBtn = document.getElementById('btnCloseReportModal');
    if (closeBtn) closeBtn.addEventListener('click', closeDailyReportModal);

    const closeFooter = document.getElementById('btnCloseReportFooter');
    if (closeFooter) closeFooter.addEventListener('click', closeDailyReportModal);

    const copyBtn = document.getElementById('btnCopyReportText');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const previewEl = document.getElementById('dailyReportPreview');
        if (previewEl) {
          navigator.clipboard.writeText(previewEl.value).then(() => {
            ui.showToast('Daily Report copied to clipboard! Ready to paste.', 'success');
          }).catch(err => {
            ui.showToast('Failed to copy text', 'error');
          });
        }
      });
    }
  }

  function renderPortalUsers() {}

  function bindAuthEvents() {
    if (!auth) return;

    const portalTabBtnSignIn = document.getElementById('portalTabBtnSignIn');
    const portalTabBtnSignUp = document.getElementById('portalTabBtnSignUp');
    const portalPaneSignIn = document.getElementById('portalPaneSignIn');
    const portalPaneSignUp = document.getElementById('portalPaneSignUp');
    const portalSignInForm = document.getElementById('portalSignInForm');
    const portalSignUpForm = document.getElementById('portalSignUpForm');
    const btnSwitchToSignUp = document.getElementById('btnSwitchToSignUp');
    const btnSwitchToSignIn = document.getElementById('btnSwitchToSignIn');

    const btnUserProfile = document.getElementById('btnUserProfile');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const btnDropdownLogout = document.getElementById('btnDropdownLogout');
    const btnOpenForgotPassword = document.getElementById('btnOpenForgotPassword');
    const btnForgotBackToSignIn = document.getElementById('btnForgotBackToSignIn');
    const portalForgotForm = document.getElementById('portalForgotForm');

    function switchToSignInTab() {
      if (portalTabBtnSignIn) portalTabBtnSignIn.classList.add('active');
      if (portalTabBtnSignUp) portalTabBtnSignUp.classList.remove('active');
      if (portalPaneSignIn) portalPaneSignIn.classList.remove('hidden');
      if (portalPaneSignUp) portalPaneSignUp.classList.add('hidden');
      const fPane = document.getElementById('portalPaneForgotPassword');
      if (fPane) fPane.classList.add('hidden');
    }

    function switchToSignUpTab() {
      if (portalTabBtnSignUp) portalTabBtnSignUp.classList.add('active');
      if (portalTabBtnSignIn) portalTabBtnSignIn.classList.remove('active');
      if (portalPaneSignUp) portalPaneSignUp.classList.remove('hidden');
      if (portalPaneSignIn) portalPaneSignIn.classList.add('hidden');
      const fPane = document.getElementById('portalPaneForgotPassword');
      if (fPane) fPane.classList.add('hidden');
    }

    function switchToForgotTab() {
      if (portalTabBtnSignIn) portalTabBtnSignIn.classList.remove('active');
      if (portalTabBtnSignUp) portalTabBtnSignUp.classList.remove('active');
      if (portalPaneSignIn) portalPaneSignIn.classList.add('hidden');
      if (portalPaneSignUp) portalPaneSignUp.classList.add('hidden');
      const fPane = document.getElementById('portalPaneForgotPassword');
      if (fPane) fPane.classList.remove('hidden');
    }

    if (portalTabBtnSignIn) portalTabBtnSignIn.addEventListener('click', switchToSignInTab);
    if (portalTabBtnSignUp) portalTabBtnSignUp.addEventListener('click', switchToSignUpTab);
    if (btnSwitchToSignUp) btnSwitchToSignUp.addEventListener('click', switchToSignUpTab);
    if (btnSwitchToSignIn) btnSwitchToSignIn.addEventListener('click', switchToSignInTab);
    if (btnOpenForgotPassword) btnOpenForgotPassword.addEventListener('click', switchToForgotTab);
    if (btnForgotBackToSignIn) btnForgotBackToSignIn.addEventListener('click', switchToSignInTab);

    // Password visibility toggle
    document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
          if (window.lucide) window.lucide.createIcons();
        }
      });
    });

    if (portalSignInForm) {
      portalSignInForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('portalSignInEmail').value;
        const password = document.getElementById('portalSignInPassword').value;
        try {
          const logged = auth.login(email, password);
          ui.showToast(`Welcome back, ${logged.name}!`, 'success');
          portalSignInForm.reset();
          updateAuthGate();
        } catch (err) {
          ui.showToast(err.message, 'error');
        }
      });
    }

    if (portalSignUpForm) {
      portalSignUpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('portalSignUpName').value;
        const email = document.getElementById('portalSignUpEmail').value;
        const password = document.getElementById('portalSignUpPassword').value;
        const role = document.getElementById('portalSignUpRole') ? document.getElementById('portalSignUpRole').value : 'Team Member';
        try {
          const newUser = auth.registerUser(name, email, password, role);
          ui.showToast(`Account created! Welcome, ${newUser.name}.`, 'success');
          portalSignUpForm.reset();
          updateAuthGate();
        } catch (err) {
          ui.showToast(err.message, 'error');
        }
      });
    }

    if (portalForgotForm) {
      portalForgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('portalForgotEmail').value;
        const newPass = document.getElementById('portalForgotNewPassword').value;
        try {
          auth.resetPassword(email, newPass);
          ui.showToast('Password reset successfully! Logged in.', 'success');
          portalForgotForm.reset();
          updateAuthGate();
        } catch (err) {
          ui.showToast(err.message, 'error');
        }
      });
    }

    // User Profile Dropdown Toggle
    if (btnUserProfile && userDropdownMenu) {
      btnUserProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdownMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!btnUserProfile.contains(e.target) && !userDropdownMenu.contains(e.target)) {
          userDropdownMenu.classList.add('hidden');
        }
      });
    }

    // Logout Handler
    if (btnDropdownLogout) {
      btnDropdownLogout.addEventListener('click', () => {
        if (userDropdownMenu) userDropdownMenu.classList.add('hidden');
        auth.logout();
        updateAuthGate();
        const pwdInput = document.getElementById('portalSignInPassword');
        if (pwdInput) pwdInput.value = '';
        ui.showToast('You have been logged out safely.', 'info');
      });
    }
  }

  function bindAdminEvents() {}

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeWorkModal();
        closeCloudModal();
        closeImportExportModal();
        closeDailyReportModal();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openWorkModal();
      }
    });
  }
}

// Ensure execution on ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkPulseApp);
} else {
  initWorkPulseApp();
}