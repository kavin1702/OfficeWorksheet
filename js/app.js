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

  let currentView = 'table'; // 'table' | 'matrix' | 'cards' | 'calendar' | 'analytics'
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
    switchModalWorkType: (type) => switchModalWorkType(type),
    exportSimulationExcel: () => ie.exportSimulationSummaryExcel(),
    openReport: () => openDailyReportModal(),
    closeReport: () => closeDailyReportModal(),
    openImportExport: () => openImportExportModal(),
    closeImportExport: () => closeImportExportModal(),
    openCloud: () => openCloudModal(),
    closeCloud: () => closeCloudModal(),
    switchView: (v) => switchView(v),
    handleFilterChange: () => {
      const wt = document.getElementById('filterWorkType');
      if (wt) manager.setFilter('workType', wt.value);
      renderApp();
    },
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
        manager.setFilter('dateRange', 'all');
        updateDatePillsUI('all');
        renderApp();
      } else {
        ui.showToast(res.message, 'info');
      }
    }
  };

  // 2. Initialize Theme (Supports Light and Dark)
  initTheme();

  // 3. User Authentication Gatekeeper & Session Listener
  const authPortal = document.getElementById('authPortal');
  const appContainer = document.getElementById('app');

  // Expose global login handlers for immediate execution
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

      const currentUser = auth.getCurrentUser();
      const isAdmin = auth.isAdmin(currentUser);

      // Default date filter to 'all' so all simulation tasks are immediately visible upon login
      manager.setFilter('dateRange', 'all');
      updateDatePillsUI('all');

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
    auth.onUserChange(() => {
      updateAuthGate();
    });
  }

  // 4. Setup UI Event Listeners
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

  // 5. Initialize Cloud Sync Status Listener & Remote Changes
  cloud.onStatusChange((status, message) => {
    updateCloudStatusBadge(status, message);
  });

  cloud.onDataChange(async (evt) => {
    if (evt && evt.action === 'remote_sync') {
      await manager.initialize();
      renderApp();
    }
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
    let dateContext = 'All Records';
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

    // Render Matrix View
    if (currentView === 'matrix') {
      renderMatrixView();
    }

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
  // Handlers for Worksheet Items
  // =========================================================================
  async function handleStatusChange(id, newStatus) {
    try {
      await manager.updateStatus(id, newStatus);
      ui.showToast(`Status updated to ${newStatus}`, 'success');
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
      
      manager.setFilter('search', '');
      manager.setFilter('project', 'all');
      manager.setFilter('status', 'all');
      manager.setFilter('workType', 'all');
      manager.setFilter('dateRange', 'all');
      updateDatePillsUI('all');
      renderApp();

      if (cloned && cloned.id) {
        setTimeout(() => {
          const row = document.querySelector(`tr[data-id="${cloned.id}"]`) || document.querySelector(`.worksheet-card[data-id="${cloned.id}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('row-highlight-pulse');
            setTimeout(() => row.classList.remove('row-highlight-pulse'), 3000);
          }
        }, 120);
      }
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
  // UI Event Bindings
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
    const savedTheme = localStorage.getItem('workpulse_theme') || 'theme-dark';
    document.body.className = savedTheme;
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const isLight = document.body.classList.contains('theme-light');
    const newTheme = isLight ? 'theme-dark' : 'theme-light';
    document.body.className = newTheme;
    localStorage.setItem('workpulse_theme', newTheme);
    updateThemeIcon(newTheme);
    renderApp();
  }

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.setAttribute('data-lucide', theme === 'theme-light' ? 'moon' : 'sun');
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

    // Date pills
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

    // WorkType Dropdown
    const filterWork = document.getElementById('filterWorkType');
    if (filterWork) {
      filterWork.addEventListener('change', (e) => {
        manager.setFilter('workType', e.target.value);
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
          manager.setFilter('dateRange', 'all');
          updateDatePillsUI('all');
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
    const matrixEl = document.getElementById('matrixViewContainer');
    const cardsEl = document.getElementById('cardsViewContainer');
    const calEl = document.getElementById('calendarViewContainer');
    const chartEl = document.getElementById('analyticsViewContainer');

    if (tableEl) tableEl.classList.toggle('hidden', viewName !== 'table');
    if (matrixEl) matrixEl.classList.toggle('hidden', viewName !== 'matrix');
    if (cardsEl) cardsEl.classList.toggle('hidden', viewName !== 'cards');
    if (calEl) calEl.classList.toggle('hidden', viewName !== 'calendar');
    if (chartEl) chartEl.classList.toggle('hidden', viewName !== 'analytics');

    if (viewName === 'matrix') {
      renderMatrixView();
    } else if (viewName === 'calendar') {
      renderCalendarView();
    } else if (viewName === 'analytics') {
      const entries = manager.getFilteredEntries();
      const metrics = manager.getMetrics(entries);
      ui.renderCharts(metrics);
    }
  }

  function renderMatrixView() {
    const matrix = manager.getSimulationMatrix();
    ui.renderSimulationMatrix(
      matrix,
      (filteredProj) => {
        manager.setFilter('project', filteredProj);
        const filterProjSelect = document.getElementById('filterProject');
        if (filterProjSelect) filterProjSelect.value = filteredProj;
        switchView('table');
        renderApp();
      },
      (projectToLog, type) => {
        openWorkModal({
          projectName: projectToLog,
          workType: type,
          date: WorksheetManager.getTodayStr(),
          status: 'In Progress',
          hoursWorked: 4,
          priority: 'High',
          work: '',
          remarks: ''
        });
      }
    );
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

  function switchModalWorkType(type) {
    const radioWorked = document.getElementById('radioTypeWorked');
    const radioTested = document.getElementById('radioTypeTested');
    const labelWorked = document.getElementById('labelTypeWorked');
    const labelTested = document.getElementById('labelTypeTested');
    const select = document.getElementById('modalProjectSelect');

    const isTested = type === 'Tested';
    if (radioWorked) radioWorked.checked = !isTested;
    if (radioTested) radioTested.checked = isTested;

    if (labelWorked) labelWorked.classList.toggle('active', !isTested);
    if (labelTested) labelTested.classList.toggle('active', isTested);

    if (select) {
      select.innerHTML = '<option value="">-- Choose Simulation Project --</option>';
      const list = isTested ? (window.SIMULATIONS_TESTED || []) : (window.SIMULATIONS_WORKED_ON || []);
      list.forEach((item, idx) => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = `${idx + 1}. ${item}`;
        select.appendChild(opt);
      });
    }
  }

  function openWorkModal(existingEntry = null, defaultDate = null) {
    const modal = document.getElementById('workModal');
    const form = document.getElementById('workEntryForm');
    const title = document.getElementById('workModalTitle');
    const saveBtnText = document.getElementById('saveBtnText');

    if (form) form.reset();

    const isTested = existingEntry ? (existingEntry.workType === 'Tested' || (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(existingEntry.projectName))) : false;
    switchModalWorkType(isTested ? 'Tested' : 'Worked');

    if (existingEntry) {
      if (title) title.textContent = 'Edit Work Log';
      if (saveBtnText) saveBtnText.textContent = 'Update Log';
      const idEl = document.getElementById('workEntryId');
      if (idEl) idEl.value = existingEntry.id;
      const dateEl = document.getElementById('workDate');
      if (dateEl) dateEl.value = existingEntry.date;
      const projEl = document.getElementById('projectNameInput');
      if (projEl) projEl.value = existingEntry.projectName;
      const selectProj = document.getElementById('modalProjectSelect');
      if (selectProj) selectProj.value = existingEntry.projectName;
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

    if (modal) modal.classList.remove('hidden');
  }

  function closeWorkModal() {
    const modal = document.getElementById('workModal');
    if (modal) modal.classList.add('hidden');
  }

  function bindWorkModalEvents() {
    const form = document.getElementById('workEntryForm');
    const closeBtn = document.getElementById('btnCloseWorkModal');
    const cancelBtn = document.getElementById('btnCancelWorkModal');
    const modal = document.getElementById('workModal');

    if (closeBtn) closeBtn.addEventListener('click', closeWorkModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeWorkModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeWorkModal();
      });
    }

    // Quick Date Chips
    const chipToday = document.getElementById('chipToday');
    if (chipToday) {
      chipToday.addEventListener('click', () => {
        const d = document.getElementById('workDate');
        if (d) d.value = WorksheetManager.getTodayStr();
      });
    }

    const chipYesterday = document.getElementById('chipYesterday');
    if (chipYesterday) {
      chipYesterday.addEventListener('click', () => {
        const d = document.getElementById('workDate');
        if (d) d.value = WorksheetManager.getYesterdayStr();
      });
    }

    // Form Submit Handler (Guaranteed Immediate Display & Filter Synchronization)
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('workEntryId').value;
        const date = document.getElementById('workDate').value || WorksheetManager.getTodayStr();
        const selectProj = document.getElementById('modalProjectSelect');
        const inputProj = document.getElementById('projectNameInput');
        const projectName = (inputProj && inputProj.value.trim()) || (selectProj && selectProj.value.trim()) || 'General';

        const workTypeRadio = document.querySelector('input[name="workTypeRadio"]:checked');
        const workType = workTypeRadio ? workTypeRadio.value : 'Worked';
        const work = document.getElementById('workDescription').value;
        const status = document.getElementById('workStatus').value;
        const hoursWorked = parseFloat(document.getElementById('workHours').value) || 0;
        const priority = document.getElementById('workPriority').value;
        const remarks = document.getElementById('workRemarks').value;

        const payload = {
          date,
          projectName,
          workType,
          work,
          status,
          hoursWorked,
          priority,
          remarks
        };

        const submitBtn = document.getElementById('btnSaveWorkModal');
        if (submitBtn) submitBtn.disabled = true;

        try {
          let savedRecord;
          if (id) {
            savedRecord = await manager.updateEntry(id, payload);
            ui.showToast('Work log updated successfully!', 'success');
          } else {
            savedRecord = await manager.addEntry(payload);
            ui.showToast('New work log saved successfully!', 'success');
          }
          closeWorkModal();

          // 1. Reset all search and dropdown filters so the new entry cannot be hidden
          manager.setFilter('search', '');
          const searchInput = document.getElementById('searchInput');
          const btnClearSearch = document.getElementById('btnClearSearch');
          if (searchInput) searchInput.value = '';
          if (btnClearSearch) btnClearSearch.classList.add('hidden');

          manager.setFilter('project', 'all');
          const filterProj = document.getElementById('filterProject');
          if (filterProj) filterProj.value = 'all';

          manager.setFilter('status', 'all');
          const filterStat = document.getElementById('filterStatus');
          if (filterStat) filterStat.value = 'all';

          manager.setFilter('workType', 'all');
          const filterWork = document.getElementById('filterWorkType');
          if (filterWork) filterWork.value = 'all';

          // 2. Set date filter to 'all' so any date is immediately shown
          manager.setFilter('dateRange', 'all');
          updateDatePillsUI('all');
          const customDateContainer = document.getElementById('customDateContainer');
          if (customDateContainer) customDateContainer.classList.add('hidden');

          // 3. If in calendar view, update selected date to the entry's date
          if (savedRecord && savedRecord.date) {
            const parts = savedRecord.date.split('-');
            if (parts.length >= 3) {
              calendarYear = parseInt(parts[0], 10);
              calendarMonth = parseInt(parts[1], 10) - 1;
              calendarSelectedDate = savedRecord.date;
            }
          }

          // 4. Switch to table view if currently on matrix or analytics
          if (currentView === 'matrix' || currentView === 'analytics') {
            switchView('table');
          }

          // 5. Immediate App Render
          renderApp();

          // 6. Highlight and scroll to the new entry
          if (savedRecord && savedRecord.id) {
            setTimeout(() => {
              const targetRow = document.querySelector(`tr[data-id="${savedRecord.id}"]`) || document.querySelector(`.worksheet-card[data-id="${savedRecord.id}"]`);
              if (targetRow) {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetRow.classList.add('row-highlight-pulse');
                setTimeout(() => {
                  targetRow.classList.remove('row-highlight-pulse');
                }, 3000);
              }
            }, 120);
          }
        } catch (err) {
          ui.showToast('Failed to save log: ' + err.message, 'error');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  // Cloud Modal Handlers
  function openCloudModal() {
    const modal = document.getElementById('cloudModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeCloudModal() {
    const modal = document.getElementById('cloudModal');
    if (modal) modal.classList.add('hidden');
  }

  function bindCloudModalEvents() {
    const closeBtn = document.getElementById('btnCloseCloudModal');
    const closeFooter = document.getElementById('btnCloseCloudFooter');
    const modal = document.getElementById('cloudModal');

    if (closeBtn) closeBtn.addEventListener('click', closeCloudModal);
    if (closeFooter) closeFooter.addEventListener('click', closeCloudModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCloudModal();
      });
    }

    const btnManualSync = document.getElementById('btnManualSync');
    if (btnManualSync) {
      btnManualSync.addEventListener('click', async () => {
        try {
          ui.showToast('Connecting to Google Sheets...', 'info');
          await manager.initialize();
          renderApp();
          ui.showToast('Cloud database synchronized successfully!', 'success');
        } catch (err) {
          ui.showToast('Sync error: ' + err.message, 'error');
        }
      });
    }
  }

  // Import / Export Modal
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
    const closeFooter = document.getElementById('btnCloseIEFooter');
    const modal = document.getElementById('importExportModal');

    if (closeBtn) closeBtn.addEventListener('click', closeImportExportModal);
    if (closeFooter) closeFooter.addEventListener('click', closeImportExportModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeImportExportModal();
      });
    }

    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => {
        ie.exportSimulationSummaryExcel();
      });
    }

    const btnExportCsv = document.getElementById('btnExportCsv');
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', () => {
        ie.exportToCsv(manager.getFilteredEntries());
      });
    }

    const btnExportJson = document.getElementById('btnExportJson');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => {
        ie.exportToJson(manager.entries);
      });
    }
  }

  // Daily Report Modal
  function openDailyReportModal() {
    const modal = document.getElementById('reportModal');
    const preview = document.getElementById('dailyReportPreview');
    if (preview) {
      const entries = manager.getFilteredEntries();
      const currentUser = auth.getCurrentUser();
      let text = `WORK STATUS REPORT - ${UIRenderer.formatDisplayDate(WorksheetManager.getTodayStr())}\n`;
      text += `User: ${currentUser ? currentUser.name : 'Kavin (8chili)'}\n\n`;

      if (entries.length === 0) {
        text += `No tasks recorded for this period.\n`;
      } else {
        entries.forEach((e, idx) => {
          text += `${idx + 1}. [${e.status}] ${e.projectName} (${e.hoursWorked || 0}h)\n   ${e.work.replace(/\n/g, ' ')}\n`;
          if (e.remarks) text += `   Note: ${e.remarks}\n`;
        });
      }
      preview.value = text;
    }
    if (modal) modal.classList.remove('hidden');
  }

  function closeDailyReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.classList.add('hidden');
  }

  function bindDailyReportEvents() {
    const closeBtn = document.getElementById('btnCloseReportModal');
    const closeFooter = document.getElementById('btnCloseReportFooter');
    const modal = document.getElementById('reportModal');
    const copyBtn = document.getElementById('btnCopyReportText');

    if (closeBtn) closeBtn.addEventListener('click', closeDailyReportModal);
    if (closeFooter) closeFooter.addEventListener('click', closeDailyReportModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDailyReportModal();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const preview = document.getElementById('dailyReportPreview');
        if (preview && preview.value) {
          navigator.clipboard.writeText(preview.value).then(() => {
            ui.showToast('Report copied to clipboard!', 'success');
          }).catch(() => {
            ui.showToast('Report copied!', 'success');
          });
        }
      });
    }
  }

  function bindAuthEvents() {
    const btnProfile = document.getElementById('btnUserProfile');
    const menu = document.getElementById('userDropdownMenu');
    const logoutBtn = document.getElementById('btnDropdownLogout');
    const switchBtn = document.getElementById('btnDropdownSwitchUser');

    if (btnProfile && menu) {
      btnProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!btnProfile.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.add('hidden');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (menu) menu.classList.add('hidden');
        auth.logout();
        ui.showToast('Signed out successfully', 'info');
        updateAuthGate();
      });
    }

    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        if (menu) menu.classList.add('hidden');
        auth.logout();
        updateAuthGate();
      });
    }
  }

  function bindAdminEvents() {
    // Admin management
  }

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeWorkModal();
        closeCloudModal();
        closeImportExportModal();
        closeDailyReportModal();
      }
    });
  }

  function renderPortalUsers() {
    const listEl = document.getElementById('portalQuickUsersList');
    if (!listEl) return;
    const users = auth.getAllUsers();
    listEl.innerHTML = '';

    users.forEach(u => {
      const card = document.createElement('div');
      card.className = 'portal-user-chip';
      const initial = (u.name || 'U').charAt(0).toUpperCase();
      const color = u.color || '#2563eb';

      card.innerHTML = `
        <div class="user-avatar-large" style="background-color: ${color}; width: 34px; height: 34px; font-size: 0.85rem;">${initial}</div>
        <div style="flex: 1; min-width: 0; text-align: left;">
          <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${ui.escapeHtml(u.name)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${ui.escapeHtml(u.email)}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        handleQuickLogin(u.email);
      });

      listEl.appendChild(card);
    });
  }
}

// Start app
document.addEventListener('DOMContentLoaded', initWorkPulseApp);