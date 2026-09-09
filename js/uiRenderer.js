/**
 * UI Renderer Module (WorkPulse)
 * Handles DOM rendering for table, cards, metric cards, simulation matrix, calendar, charts, and notifications.
 */

class UIRenderer {
  constructor() {
    this.statusChart = null;
    this.projectChart = null;
  }

  // Format date nicely (e.g., "Today, Aug 15" or "15 Aug 2026")
  static formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const todayStr = WorksheetManager.getTodayStr();
    const yesterdayStr = WorksheetManager.getYesterdayStr();

    if (dateStr === todayStr) return 'Today, ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dateStr === yesterdayStr) return 'Yesterday';

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  }

  // Get CSS class and icon for status
  static getStatusMeta(status) {
    switch (status) {
      case 'Completed':
        return { cls: 'status-completed', icon: 'check-circle-2', label: 'Completed' };
      case 'In Progress':
        return { cls: 'status-in-progress', icon: 'clock', label: 'In Progress' };
      case 'Pending':
        return { cls: 'status-pending', icon: 'hourglass', label: 'Pending' };
      case 'Blocked':
        return { cls: 'status-blocked', icon: 'alert-octagon', label: 'Blocked' };
      case 'Under Review':
        return { cls: 'status-under-review', icon: 'eye', label: 'Under Review' };
      case 'Leave':
        return { cls: 'status-leave', icon: 'sun', label: 'Leave / Off' };
      default:
        return { cls: 'status-in-progress', icon: 'clock', label: status || 'In Progress' };
    }
  }

  static getStatusOptionsHtml(currentStatus) {
    const statuses = [
      { val: 'Completed', label: 'âœ… Completed' },
      { val: 'In Progress', label: 'ðŸ”„ In Progress' },
      { val: 'Pending', label: 'â³ Pending' },
      { val: 'Blocked', label: 'ðŸ›‘ Blocked' },
      { val: 'Under Review', label: 'ðŸ” Under Review' },
      { val: 'Leave', label: 'ðŸ–ï¸ Leave / Off' }
    ];
    return statuses.map(s => `<option value="${s.val}" ${currentStatus === s.val ? 'selected' : ''}>${s.label}</option>`).join('');
  }

  // Get priority badge class
  static getPriorityClass(priority) {
    switch ((priority || '').toLowerCase()) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  }

  // Render Metric Cards
  renderMetrics(metrics, dateContext = 'Filtered') {
    const totalEl = document.getElementById('metricTotalTasks');
    const compEl = document.getElementById('metricCompletedTasks');
    const rateEl = document.getElementById('metricCompletionRate');
    const progEl = document.getElementById('metricInProgressTasks');
    const pendSubEl = document.getElementById('metricPendingSub');
    const hoursEl = document.getElementById('metricTotalHours');
    const ctxEl = document.getElementById('metricFilterContext');

    const workedHoursEl = document.getElementById('metricWorkedHours');
    const testedHoursEl = document.getElementById('metricTestedHours');

    const completed = metrics.completed || 0;
    const inProgress = metrics.inProgress || 0;
    const pending = metrics.pending || 0;
    const blocked = metrics.blocked || 0;
    const totalHours = metrics.totalHours || 0;
    const totalTasks = metrics.totalTasks || 0;
    const rate = metrics.completionRate || 0;

    if (totalEl) totalEl.textContent = totalTasks;
    if (compEl) compEl.textContent = completed;
    if (rateEl) rateEl.textContent = `${rate}%`;
    if (progEl) progEl.textContent = inProgress + pending;
    if (pendSubEl) pendSubEl.textContent = `${pending} pending, ${blocked} blocked`;
    if (hoursEl) hoursEl.textContent = typeof totalHours === 'number' ? totalHours.toFixed(1) : parseFloat(totalHours || 0).toFixed(1);
    if (ctxEl) ctxEl.textContent = dateContext;

    if (workedHoursEl) workedHoursEl.textContent = `${metrics.totalWorkedHours || 0}h (${metrics.totalWorkedTasks || 0} dev)`;
    if (testedHoursEl) testedHoursEl.textContent = `${metrics.totalTestedHours || 0}h (${metrics.totalTestedTasks || 0} QA)`;
  }

  // Render Table View (Desktop & Tablet)
  renderTable(entries, onStatusChange, onEdit, onDuplicate, onDelete, showUserBadge = false) {
    const tbody = document.getElementById('worksheetTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            <div style="max-width: 320px; margin: 0 auto;">
              <i data-lucide="inbox" style="width: 38px; height: 38px; opacity: 0.4; margin: 0 auto 0.75rem auto; display: block;"></i>
              <strong style="color: #ffffff; display: block; margin-bottom: 0.35rem;">No tasks found</strong>
              <p style="font-size: 0.82rem; margin: 0;">Try adjusting your filters or click <strong>+ Log Work</strong> to add a new task.</p>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    entries.forEach(entry => {
      const tr = document.createElement('tr');
      tr.dataset.id = entry.id;

      const statusMeta = UIRenderer.getStatusMeta(entry.status);
      const priorityCls = UIRenderer.getPriorityClass(entry.priority);
      const formattedDate = UIRenderer.formatDisplayDate(entry.date);
      const isTest = (entry.workType === 'Tested') || (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(entry.projectName));

      tr.innerHTML = `
        <td class="col-date" title="${entry.date}">
          <strong>${formattedDate}</strong>
        </td>
        <td class="col-project">
          ${(showUserBadge && entry.userName) ? `<span class="user-badge-pill" style="background-color: ${this.getUserColor(entry.userName)};"><i data-lucide="user" class="icon-xs"></i> ${this.escapeHtml(entry.userName)}</span>` : ''}
          <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
            <span class="worktype-badge ${isTest ? 'tested' : 'worked'}">${isTest ? 'ðŸ§ª Tested' : 'ðŸ› ï¸ Worked'}</span>
            <span class="project-pill">${this.escapeHtml(entry.projectName)}</span>
          </div>
        </td>
        <td class="col-work">
          <div class="work-text">${this.escapeHtml(entry.work).replace(/\n/g, '<br>')}</div>
          ${entry.remarks ? `<div class="work-remarks"><i data-lucide="info" class="icon-xs"></i> ${this.escapeHtml(entry.remarks)}</div>` : ''}
        </td>
        <td class="col-status">
          <select class="inline-status-select ${statusMeta.cls}" data-id="${entry.id}">
            ${UIRenderer.getStatusOptionsHtml(entry.status)}
          </select>
        </td>
        <td class="col-hours">
          <strong>${entry.hoursWorked ? entry.hoursWorked + ' hrs' : '-'}</strong>
        </td>
        <td class="col-priority">
          <span class="priority-pill ${priorityCls}">${entry.priority || 'Medium'}</span>
        </td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="btn-action edit" data-id="${entry.id}" title="Edit Work Log" aria-label="Edit">
              <i data-lucide="edit-2" class="icon-xs"></i>
            </button>
            <button class="btn-action duplicate" data-id="${entry.id}" title="Duplicate into Today's Log" aria-label="Duplicate">
              <i data-lucide="copy" class="icon-xs"></i>
            </button>
            <button class="btn-action delete" data-id="${entry.id}" title="Delete Log" aria-label="Delete">
              <i data-lucide="trash-2" class="icon-xs"></i>
            </button>
          </div>
        </td>
      `;

      // Event bindings for inline controls
      const statusSelect = tr.querySelector('.inline-status-select');
      statusSelect.addEventListener('change', (e) => {
        onStatusChange(entry.id, e.target.value);
      });

      const editBtn = tr.querySelector('.btn-action.edit');
      editBtn.addEventListener('click', () => onEdit(entry));

      const dupBtn = tr.querySelector('.btn-action.duplicate');
      dupBtn.addEventListener('click', () => onDuplicate(entry.id));

      const delBtn = tr.querySelector('.btn-action.delete');
      delBtn.addEventListener('click', () => onDelete(entry.id));

      tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Render Mobile Cards View (Phones)
  renderCards(entries, onStatusChange, onEdit, onDuplicate, onDelete, showUserBadge = false) {
    const grid = document.getElementById('worksheetCardsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'worksheet-card';
      card.dataset.id = entry.id;

      const statusMeta = UIRenderer.getStatusMeta(entry.status);
      const priorityCls = UIRenderer.getPriorityClass(entry.priority);
      const formattedDate = UIRenderer.formatDisplayDate(entry.date);
      const isTest = (entry.workType === 'Tested') || (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(entry.projectName));

      card.innerHTML = `
        <div class="card-top-row">
          <span class="card-date"><i data-lucide="calendar" class="icon-xs"></i> ${formattedDate}</span>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <span class="worktype-badge ${isTest ? 'tested' : 'worked'}">${isTest ? 'ðŸ§ª Tested' : 'ðŸ› ï¸ Worked'}</span>
            <span class="priority-pill ${priorityCls}">${entry.priority || 'Medium'}</span>
          </div>
        </div>

        <div class="card-project-title">
          ${(showUserBadge && entry.userName) ? `<span class="user-badge-pill" style="background-color: ${this.getUserColor(entry.userName)}; font-size: 0.68rem;"><i data-lucide="user" class="icon-xs"></i> ${this.escapeHtml(entry.userName)}</span>` : ''}
          ${this.escapeHtml(entry.projectName)}
        </div>
        <div class="card-work-desc">${this.escapeHtml(entry.work).replace(/\n/g, '<br>')}</div>

        ${entry.remarks ? `<div class="work-remarks"><i data-lucide="info" class="icon-xs"></i> ${this.escapeHtml(entry.remarks)}</div>` : ''}

        <div class="card-bottom-row">
          <div class="card-meta-chips">
            <select class="inline-status-select ${statusMeta.cls}" data-id="${entry.id}">
              ${UIRenderer.getStatusOptionsHtml(entry.status)}
            </select>
            ${entry.hoursWorked ? `<span class="card-hours-chip"><i data-lucide="clock" class="icon-xs"></i> ${entry.hoursWorked}h</span>` : ''}
          </div>

          <div class="row-actions">
            <button class="btn-action edit" data-id="${entry.id}" title="Edit"><i data-lucide="edit-2" class="icon-xs"></i></button>
            <button class="btn-action duplicate" data-id="${entry.id}" title="Duplicate"><i data-lucide="copy" class="icon-xs"></i></button>
            <button class="btn-action delete" data-id="${entry.id}" title="Delete"><i data-lucide="trash-2" class="icon-xs"></i></button>
          </div>
        </div>
      `;

      // Event bindings
      const statusSelect = card.querySelector('.inline-status-select');
      statusSelect.addEventListener('change', (e) => onStatusChange(entry.id, e.target.value));

      card.querySelector('.btn-action.edit').addEventListener('click', () => onEdit(entry));
      card.querySelector('.btn-action.duplicate').addEventListener('click', () => onDuplicate(entry.id));
      card.querySelector('.btn-action.delete').addEventListener('click', () => onDelete(entry.id));

      grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Get dynamic hash color for user name badge
  getUserColor(name) {
    if (!name) return '#3b82f6';
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  // Render Top Header User Profile Chip
  renderUserProfileHeader(user) {
    if (!user) return;
    const avatarBadge = document.getElementById('headerUserAvatar');
    const nameLabel = document.getElementById('headerUserName');
    const dropAvatar = document.getElementById('dropdownUserAvatar');
    const dropName = document.getElementById('dropdownUserName');
    const dropRole = document.getElementById('dropdownUserRole');

    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const color = user.color || this.getUserColor(user.name);
    const isAdminUser = window.authManager ? window.authManager.isAdmin(user) : false;

    if (avatarBadge) {
      avatarBadge.textContent = initial;
      avatarBadge.style.backgroundColor = color;
    }
    if (nameLabel) nameLabel.textContent = user.name;
    if (dropAvatar) {
      dropAvatar.textContent = initial;
      dropAvatar.style.backgroundColor = color;
    }
    if (dropName) dropName.textContent = user.name;
    if (dropRole) dropRole.textContent = isAdminUser ? 'ðŸ‘‘ Supervisor & Admin' : (user.role || 'Team Member');

    const dropAdminLink = document.getElementById('btnDropdownAdmin');
    if (dropAdminLink) {
      dropAdminLink.style.setProperty('display', isAdminUser ? 'flex' : 'none', 'important');
      dropAdminLink.classList.toggle('hidden', !isAdminUser);
    }

    const headerAdminBtn = document.getElementById('btnOpenAdminPanel');
    if (headerAdminBtn) {
      headerAdminBtn.style.setProperty('display', isAdminUser ? 'inline-flex' : 'none', 'important');
      headerAdminBtn.classList.toggle('hidden', !isAdminUser);
    }
  }

  // Populate Project Filter dropdown with clean Grouped Options
  populateProjectFilters(projects, currentFilter = 'all') {
    const select = document.getElementById('filterProject');
    if (!select) return;
    
    select.innerHTML = '<option value="all">All Simulation Projects</option>';

    let workedList = [];
    let testedList = [];
    let customList = [];

    if (typeof projects === 'object' && projects.worked) {
      workedList = projects.worked;
      testedList = projects.tested;
      customList = projects.custom || [];
    } else if (Array.isArray(projects)) {
      workedList = window.SIMULATIONS_WORKED_ON || [];
      testedList = window.SIMULATIONS_TESTED || [];
      customList = projects.filter(p => !workedList.includes(p) && !testedList.includes(p));
    }

    // 1. Group: Simulations Worked On (12)
    if (workedList.length > 0) {
      const grpWorked = document.createElement('optgroup');
      grpWorked.label = 'ðŸ› ï¸ Simulations Worked On (12)';
      workedList.forEach(pName => {
        const opt = document.createElement('option');
        opt.value = pName;
        opt.textContent = pName;
        if (pName === currentFilter) opt.selected = true;
        grpWorked.appendChild(opt);
      });
      select.appendChild(grpWorked);
    }

    // 2. Group: Simulations Tested (7)
    if (testedList.length > 0) {
      const grpTested = document.createElement('optgroup');
      grpTested.label = 'ðŸ§ª Simulations Tested (7)';
      testedList.forEach(pName => {
        const opt = document.createElement('option');
        opt.value = pName;
        opt.textContent = pName;
        if (pName === currentFilter) opt.selected = true;
        grpTested.appendChild(opt);
      });
      select.appendChild(grpTested);
    }

    // 3. Group: Other Projects
    if (customList.length > 0) {
      const grpCustom = document.createElement('optgroup');
      grpCustom.label = 'ðŸ“‚ Other / General Projects';
      customList.forEach(pName => {
        const opt = document.createElement('option');
        opt.value = pName;
        opt.textContent = pName;
        if (pName === currentFilter) opt.selected = true;
        grpCustom.appendChild(opt);
      });
      select.appendChild(grpCustom);
    }
  }

  // Render Dedicated Simulation Matrix Tracker (12 Worked + 7 Tested)
  renderSimulationMatrix(matrix, onFilterProject, onLogForProject) {
    const workedTbody = document.getElementById('matrixWorkedTableBody');
    const testedTbody = document.getElementById('matrixTestedTableBody');
    const workedCountBadge = document.getElementById('matrixWorkedCountBadge');
    const testedCountBadge = document.getElementById('matrixTestedCountBadge');

    if (workedCountBadge) workedCountBadge.textContent = `${matrix.summary.activeWorkedCount} / ${matrix.summary.totalWorkedCount} Active`;
    if (testedCountBadge) testedCountBadge.textContent = `${matrix.summary.activeTestedCount} / ${matrix.summary.totalTestedCount} Active`;

    if (workedTbody) {
      workedTbody.innerHTML = matrix.worked.map(item => `
        <tr>
          <td style="font-weight: 800; color: #a78bfa; width: 40px; text-align: center;">${item.num}</td>
          <td>
            <strong style="color: #ffffff; font-size: 0.88rem;">${this.escapeHtml(item.name)}</strong>
          </td>
          <td>
            <span class="badge ${item.totalTasks > 0 ? 'badge-primary' : 'badge-neutral'}" style="font-size: 0.72rem;">
              ${item.totalTasks > 0 ? (item.progress === 100 ? 'âœ… Completed' : 'ðŸ”„ In Progress') : 'â³ Not Started'}
            </span>
          </td>
          <td style="text-align: center;">
            <strong>${item.totalTasks}</strong> tasks (${item.completedTasks} done)
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #34d399;">${item.totalHours}h</span>
          </td>
          <td style="width: 140px;">
            <div style="background: rgba(255,255,255,0.08); border-radius: 999px; height: 7px; overflow: hidden; margin-bottom: 3px;">
              <div style="background: linear-gradient(90deg, #8b5cf6, #10b981); height: 100%; width: ${item.progress}%;"></div>
            </div>
            <span style="font-size: 0.68rem; color: var(--text-muted);">${item.progress}% Complete</span>
          </td>
          <td style="text-align: right; width: 140px;">
            <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
              <button class="btn btn-outline btn-xs btn-matrix-filter" data-project="${this.escapeHtml(item.name)}" title="View Tasks">
                <i data-lucide="filter" class="icon-xs"></i> View
              </button>
              <button class="btn btn-primary btn-xs btn-matrix-add" data-project="${this.escapeHtml(item.name)}" data-type="Worked" title="Log Work for this simulation">
                <i data-lucide="plus" class="icon-xs"></i> Log
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (testedTbody) {
      testedTbody.innerHTML = matrix.tested.map(item => `
        <tr>
          <td style="font-weight: 800; color: #38bdf8; width: 40px; text-align: center;">${item.num}</td>
          <td>
            <strong style="color: #ffffff; font-size: 0.88rem;">${this.escapeHtml(item.name)}</strong>
          </td>
          <td>
            <span class="badge ${item.totalTasks > 0 ? 'badge-primary' : 'badge-neutral'}" style="font-size: 0.72rem; background: rgba(6, 182, 212, 0.18); color: #38bdf8; border-color: rgba(6, 182, 212, 0.4);">
              ${item.totalTasks > 0 ? (item.progress === 100 ? 'âœ… QA Passed' : 'ðŸ§ª In Testing') : 'â³ Pending QA'}
            </span>
          </td>
          <td style="text-align: center;">
            <strong>${item.totalTasks}</strong> tests (${item.completedTasks} passed)
          </td>
          <td style="text-align: center;">
            <span style="font-weight: 700; color: #38bdf8;">${item.totalHours}h</span>
          </td>
          <td style="width: 140px;">
            <div style="background: rgba(255,255,255,0.08); border-radius: 999px; height: 7px; overflow: hidden; margin-bottom: 3px;">
              <div style="background: linear-gradient(90deg, #06b6d4, #3b82f6); height: 100%; width: ${item.progress}%;"></div>
            </div>
            <span style="font-size: 0.68rem; color: var(--text-muted);">${item.progress}% Passed</span>
          </td>
          <td style="text-align: right; width: 140px;">
            <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
              <button class="btn btn-outline btn-xs btn-matrix-filter" data-project="${this.escapeHtml(item.name)}" title="View Tests">
                <i data-lucide="filter" class="icon-xs"></i> View
              </button>
              <button class="btn btn-primary btn-xs btn-matrix-add" data-project="${this.escapeHtml(item.name)}" data-type="Tested" style="background: #06b6d4; border-color: #06b6d4;" title="Log QA Test">
                <i data-lucide="plus" class="icon-xs"></i> Log
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Attach button listeners
    document.querySelectorAll('.btn-matrix-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const proj = btn.dataset.project;
        if (onFilterProject) onFilterProject(proj);
      });
    });

    document.querySelectorAll('.btn-matrix-add').forEach(btn => {
      btn.addEventListener('click', () => {
        const proj = btn.dataset.project;
        const type = btn.dataset.type;
        if (onLogForProject) onLogForProject(proj, type);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Render Analytics Charts (Chart.js)
  renderCharts(metrics) {
    if (!window.Chart) return;

    const textColor = '#cbd5e1';

    // 1. Status Donut Chart
    const donutCtx = document.getElementById('statusDonutChart');
    if (donutCtx) {
      if (this.statusChart) this.statusChart.destroy();

      const completed = metrics.completed || 0;
      const inProgress = metrics.inProgress || 0;
      const pending = metrics.pending || 0;
      const blocked = metrics.blocked || 0;
      const leave = metrics.leave || 0;

      this.statusChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'In Progress', 'Pending', 'Blocked', 'Leave / Off'],
          datasets: [{
            data: [completed, inProgress, pending, blocked, leave],
            backgroundColor: [
              '#10b981', // Emerald
              '#8b5cf6', // Purple
              '#f59e0b', // Amber
              '#ef4444', // Rose
              '#06b6d4'  // Cyan
            ],
            borderWidth: 2,
            borderColor: '#12162c'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 12 } }
            }
          },
          cutout: '65%'
        }
      });
    }

    // 2. Project Hours Bar Chart
    const barCtx = document.getElementById('projectHoursBarChart');
    if (barCtx) {
      if (this.projectChart) this.projectChart.destroy();

      const projectHoursObj = metrics.projectHours || {};
      const projects = Object.keys(projectHoursObj);
      const hours = projects.map(p => projectHoursObj[p]);

      this.projectChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: projects.length > 0 ? projects : ['No data'],
          datasets: [{
            label: 'Hours Spent',
            data: hours.length > 0 ? hours : [0],
            backgroundColor: 'rgba(139, 92, 246, 0.75)',
            borderColor: '#8b5cf6',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: textColor, font: { family: 'Plus Jakarta Sans' } },
              grid: { color: 'rgba(139, 92, 246, 0.12)' },
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  // Trigger celebratory confetti on completion
  triggerConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.75 }
      });
    }
  }

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // HTML escaping utility
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Render Monthly Interactive Calendar
  renderCalendar(year, month, manager, selectedDate, onDateSelect, onAddForDate, onStatusChange, onEdit, onDuplicate, onDelete) {
    const monthTitle = document.getElementById('calendarMonthTitle');
    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;

    const dateObj = new Date(year, month, 1);
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (monthTitle) monthTitle.textContent = monthName;

    // Month Stats (safe null checks)
    const stats = manager.getMonthStats(year, month);
    const statCompleted = document.getElementById('calStatCompleted');
    const statPending = document.getElementById('calStatPending');
    const statHours = document.getElementById('calStatHours');
    const statWorkDays = document.getElementById('calStatWorkingDays');
    const statLeave = document.getElementById('calStatLeave');

    if (statCompleted) statCompleted.textContent = stats.completedCount || 0;
    if (statPending) statPending.textContent = stats.pendingCount || 0;
    if (statHours) statHours.textContent = `${stats.totalHours || 0}h`;
    if (statWorkDays) statWorkDays.textContent = stats.workingDaysCount || 0;
    if (statLeave) statLeave.textContent = stats.leaveDaysCount || 0;

    // Get Entries for this month
    const entriesMap = manager.getEntriesForMonth(year, month);

    grid.innerHTML = '';

    // Calculate start day (0=Sun, 1=Mon, ..., 6=Sat) matching Sun Mon Tue Wed Thu Fri Sat
    const firstDayIndex = dateObj.getDay(); 

    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const todayStr = WorksheetManager.getTodayStr();

    // 1. Render Previous Month trailing days
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDate = prevMonthLastDay - x + 1;
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `
        <div class="day-header-row" style="display: flex; justify-content: space-between;">
          <span class="cal-day-num" style="opacity: 0.35;">${prevDate}</span>
        </div>
      `;
      grid.appendChild(cell);
    }

    // 2. Render Current Month days
    for (let i = 1; i <= lastDayOfMonth; i++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      const fullDate = `${year}-${monthStr}-${dayStr}`;

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      if (fullDate === todayStr) cell.classList.add('today');
      if (fullDate === selectedDate) cell.classList.add('selected');

      const dayEntries = entriesMap[fullDate] || [];
      let totalDayHours = 0;
      let isLeaveDay = false;

      dayEntries.forEach(e => {
        totalDayHours += (parseFloat(e.hoursWorked) || 0);
        if (e.status === 'Leave') isLeaveDay = true;
      });

      let tasksHtml = '';
      const visibleTasks = dayEntries.slice(0, 3);
      visibleTasks.forEach(task => {
        const isTest = (task.workType === 'Tested') || (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(task.projectName));
        let statusStyle = isTest
          ? 'background: rgba(6, 182, 212, 0.22); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.4);'
          : 'background: rgba(139, 92, 246, 0.22); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.35);';

        if (task.status === 'Completed') statusStyle = 'background: rgba(16, 185, 129, 0.22); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35);';
        else if (task.status === 'Pending') statusStyle = 'background: rgba(245, 158, 11, 0.22); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35);';
        else if (task.status === 'Blocked') statusStyle = 'background: rgba(244, 63, 94, 0.22); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.35);';
        else if (task.status === 'Leave') statusStyle = 'background: rgba(217, 70, 239, 0.22); color: #e879f9; border: 1px solid rgba(217, 70, 239, 0.35);';

        tasksHtml += `
          <div class="cal-task-pill" style="${statusStyle} font-size: 0.68rem; font-weight: 600; padding: 0.1rem 0.35rem; border-radius: 4px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${isTest ? '[Tested]' : '[Worked]'} ${this.escapeHtml(task.projectName)}: ${this.escapeHtml(task.work)}">
            <span>${isTest ? 'ðŸ§ª' : 'ðŸ› ï¸'} ${this.escapeHtml(task.projectName)}</span>
          </div>
        `;
      });

      if (dayEntries.length > 3) {
        tasksHtml += `<span style="font-size: 0.65rem; color: #a78bfa; font-weight: 700; margin-top: 2px;">+${dayEntries.length - 3} more</span>`;
      }

      cell.innerHTML = `
        <div class="day-header-row" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="cal-day-num" style="font-weight: 700; color: #ffffff;">${i}</span>
          ${totalDayHours > 0 ? `<span style="font-size: 0.7rem; font-weight: 700; color: #34d399;">${totalDayHours}h</span>` : ''}
        </div>
        <div class="cal-day-badges" style="display: flex; flex-direction: column; gap: 2px; margin-top: 4px;">
          ${tasksHtml}
        </div>
      `;

      cell.addEventListener('click', () => {
        document.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        onDateSelect(fullDate);
      });

      grid.appendChild(cell);
    }

    // 3. Render Next Month leading days to complete grid (multiples of 7)
    const totalCellsSoFar = firstDayIndex + lastDayOfMonth;
    const nextDays = (7 - (totalCellsSoFar % 7)) % 7;
    for (let j = 1; j <= nextDays; j++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.innerHTML = `
        <div class="day-header-row" style="display: flex; justify-content: space-between;">
          <span class="cal-day-num" style="opacity: 0.35;">${j}</span>
        </div>
      `;
      grid.appendChild(cell);
    }

    // Render Inspector for selected date
    this.renderDayInspector(selectedDate, manager, onAddForDate, onStatusChange, onEdit, onDuplicate, onDelete);
  }

  // Render Day Inspector (shows detailed cards for the selected calendar day)
  renderDayInspector(dateStr, manager, onAddForDate, onStatusChange, onEdit, onDuplicate, onDelete) {
    const inspector = document.getElementById('calendarDayDetails');
    const title = document.getElementById('inspectorDateTitle');
    const list = document.getElementById('inspectorTasksList');
    const addBtn = document.getElementById('btnAddForSelectedDate');
    const closeBtn = document.getElementById('btnCloseDayInspector');

    if (!inspector || !list) return;

    if (!dateStr) {
      inspector.classList.add('hidden');
      return;
    }

    const entries = manager.getEntriesForDate(dateStr);
    inspector.classList.remove('hidden');
    if (title) title.textContent = `Tasks for ${UIRenderer.formatDisplayDate(dateStr)}`;

    // Add button handler
    if (addBtn) addBtn.onclick = () => onAddForDate(dateStr);
    if (closeBtn) closeBtn.onclick = () => inspector.classList.add('hidden');

    if (entries.length === 0) {
      list.innerHTML = `
        <p style="font-size: 0.85rem; color: var(--text-muted); padding: 0.5rem 0;">
          No work logs recorded for this day. Click "+ Add Log For This Day" above to create one.
        </p>
      `;
      return;
    }

    list.innerHTML = '';
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'inspector-task-item';
      const statusMeta = UIRenderer.getStatusMeta(entry.status);
      const isTest = (entry.workType === 'Tested') || (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(entry.projectName));

      item.innerHTML = `
        <div class="inspector-task-main">
          <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 4px;">
            <span class="worktype-badge ${isTest ? 'tested' : 'worked'}">${isTest ? 'ðŸ§ª Tested' : 'ðŸ› ï¸ Worked'}</span>
            <div class="inspector-project">${this.escapeHtml(entry.projectName)}</div>
          </div>
          <div class="inspector-work">${this.escapeHtml(entry.work).replace(/\n/g, '<br>')}</div>
          ${entry.remarks ? `<div class="work-remarks" style="margin-top: 4px;"><i data-lucide="info" class="icon-xs"></i> ${this.escapeHtml(entry.remarks)}</div>` : ''}
        </div>
        <div class="inspector-task-side">
          <select class="inline-status-select ${statusMeta.cls}" data-id="${entry.id}">
            ${UIRenderer.getStatusOptionsHtml(entry.status)}
          </select>
          <button class="btn-action edit" title="Edit"><i data-lucide="edit-2" class="icon-xs"></i></button>
          <button class="btn-action duplicate" title="Duplicate"><i data-lucide="copy" class="icon-xs"></i></button>
          <button class="btn-action delete" title="Delete"><i data-lucide="trash-2" class="icon-xs"></i></button>
        </div>
      `;

      item.querySelector('.inline-status-select').addEventListener('change', (e) => onStatusChange(entry.id, e.target.value));
      item.querySelector('.btn-action.edit').addEventListener('click', () => onEdit(entry));
      item.querySelector('.btn-action.duplicate').addEventListener('click', () => onDuplicate(entry.id));
      item.querySelector('.btn-action.delete').addEventListener('click', () => onDelete(entry.id));

      list.appendChild(item);
    });

    if (window.lucide) window.lucide.createIcons();
  }
}

window.uiRenderer = new UIRenderer();