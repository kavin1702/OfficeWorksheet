/**
 * UI Renderer Module
 * Handles DOM rendering for table, mobile cards, metric cards, charts, and notifications.
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
    document.getElementById('metricTotalTasks').textContent = metrics.totalTasks;
    document.getElementById('metricCompletedTasks').textContent = metrics.completedCount;
    document.getElementById('metricCompletionRate').textContent = `${metrics.completionRate}%`;
    document.getElementById('metricInProgressTasks').textContent = metrics.inProgressCount + metrics.pendingCount;
    document.getElementById('metricPendingSub').textContent = `${metrics.pendingCount} pending, ${metrics.blockedCount} blocked`;
    document.getElementById('metricTotalHours').textContent = metrics.totalHours.toFixed(1);
    document.getElementById('metricFilterContext').textContent = dateContext;
  }

  // Render Table View (Desktop & Tablet)
  renderTable(entries, onStatusChange, onEdit, onDuplicate, onDelete, showUserBadge = false) {
    const tbody = document.getElementById('worksheetTableBody');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';

    if (entries.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    entries.forEach(entry => {
      const tr = document.createElement('tr');
      tr.dataset.id = entry.id;

      const statusMeta = UIRenderer.getStatusMeta(entry.status);
      const priorityCls = UIRenderer.getPriorityClass(entry.priority);
      const formattedDate = UIRenderer.formatDisplayDate(entry.date);

      tr.innerHTML = `
        <td class="col-date" title="${entry.date}">
          <strong>${formattedDate}</strong>
        </td>
        <td class="col-project">
          ${(showUserBadge && entry.userName) ? `<span class="user-badge-pill" style="background-color: ${this.getUserColor(entry.userName)};"><i data-lucide="user" class="icon-xs"></i> ${this.escapeHtml(entry.userName)}</span>` : ''}
          <span class="project-pill">${this.escapeHtml(entry.projectName)}</span>
        </td>
        <td class="col-work">
          <div class="work-text">${this.escapeHtml(entry.work).replace(/\n/g, '<br>')}</div>
          ${entry.remarks ? `<div class="work-remarks"><i data-lucide="info" class="icon-xs"></i> ${this.escapeHtml(entry.remarks)}</div>` : ''}
        </td>
        <td class="col-status">
          <select class="inline-status-select ${statusMeta.cls}" data-id="${entry.id}">
            <option value="Completed" ${entry.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
            <option value="In Progress" ${entry.status === 'In Progress' ? 'selected' : ''}>🔄 In Progress</option>
            <option value="Pending" ${entry.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="Blocked" ${entry.status === 'Blocked' ? 'selected' : ''}>🛑 Blocked</option>
            <option value="Under Review" ${entry.status === 'Under Review' ? 'selected' : ''}>🔍 Under Review</option>
            <option value="Leave" ${entry.status === 'Leave' ? 'selected' : ''}>🏖️ Leave / Off</option>
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
    grid.innerHTML = '';

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'worksheet-card';
      card.dataset.id = entry.id;

      const statusMeta = UIRenderer.getStatusMeta(entry.status);
      const priorityCls = UIRenderer.getPriorityClass(entry.priority);
      const formattedDate = UIRenderer.formatDisplayDate(entry.date);

      card.innerHTML = `
        <div class="card-top-row">
          <span class="card-date"><i data-lucide="calendar" class="icon-xs"></i> ${formattedDate}</span>
          <span class="priority-pill ${priorityCls}">${entry.priority || 'Medium'}</span>
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
              <option value="Completed" ${entry.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
              <option value="In Progress" ${entry.status === 'In Progress' ? 'selected' : ''}>🔄 In Progress</option>
              <option value="Pending" ${entry.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="Blocked" ${entry.status === 'Blocked' ? 'selected' : ''}>🛑 Blocked</option>
              <option value="Under Review" ${entry.status === 'Under Review' ? 'selected' : ''}>🔍 Under Review</option>
              <option value="Leave" ${entry.status === 'Leave' ? 'selected' : ''}>🏖️ Leave / Off</option>
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
    const myLabel = document.getElementById('labelMyWorksheet');

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
    if (dropRole) dropRole.textContent = isAdminUser ? '👑 Admin' : (user.role || 'Team Member');
    if (myLabel) myLabel.textContent = `${user.name}'s Worksheet`;

    const dropAdminLink = document.getElementById('btnDropdownAdmin');
    if (dropAdminLink) {
      dropAdminLink.style.display = isAdminUser ? 'flex' : 'none';
    }

    const headerAdminBtn = document.getElementById('btnOpenAdminPanel');
    if (headerAdminBtn) {
      headerAdminBtn.style.display = isAdminUser ? 'inline-flex' : 'none';
    }
  }

  // Render User Accounts List in Modal
  renderUserSwitcher(users, activeUserId, onSelectUser, onDeleteUser) {
    const container = document.getElementById('usersListContainer');
    if (!container) return;

    container.innerHTML = '';
    if (!users || users.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No user profiles found.</p>';
      return;
    }

    users.forEach(user => {
      const card = document.createElement('div');
      card.className = `user-profile-card ${user.id === activeUserId ? 'active' : ''}`;
      const initial = (user.name || 'U').charAt(0).toUpperCase();
      const color = user.color || this.getUserColor(user.name);

      card.innerHTML = `
        <div class="user-card-info">
          <div class="user-avatar-large" style="background-color: ${color}; width: 34px; height: 34px; font-size: 0.85rem;">${initial}</div>
          <div>
            <div class="user-card-name">${this.escapeHtml(user.name)} ${user.id === activeUserId ? '<span style="font-size: 0.72rem; color: var(--brand-primary); font-weight: normal;">(Active)</span>' : ''}</div>
            <div class="user-card-role">@${this.escapeHtml(user.username)} • ${this.escapeHtml(user.role || 'Member')}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button class="btn btn-xs ${user.id === activeUserId ? 'btn-primary' : 'btn-outline'} btn-select-user">
            ${user.id === activeUserId ? '✓ Selected' : 'Switch'}
          </button>
        </div>
      `;

      card.querySelector('.btn-select-user').addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectUser(user.id);
      });

      card.addEventListener('click', () => {
        onSelectUser(user.id);
      });

      container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Populate Project Filter dropdown & Modal quick tags
  populateProjectFilters(projects, currentFilter = 'all') {
    const select = document.getElementById('filterProject');
    const quickTagsContainer = document.getElementById('projectQuickTags');
    
    select.innerHTML = '<option value="all">All Projects</option>';
    if (quickTagsContainer) quickTagsContainer.innerHTML = '';

    projects.forEach(pName => {
      const opt = document.createElement('option');
      opt.value = pName;
      opt.textContent = pName;
      if (pName === currentFilter) opt.selected = true;
      select.appendChild(opt);

      // Quick Tag in modal
      if (quickTagsContainer) {
        const tag = document.createElement('button');
        tag.type = 'button';
        tag.className = 'project-tag-pill';
        tag.textContent = pName;
        tag.addEventListener('click', () => {
          document.getElementById('projectNameInput').value = pName;
        });
        quickTagsContainer.appendChild(tag);
      }
    });
  }

  // Render Analytics Charts (Chart.js)
  renderCharts(metrics) {
    if (!window.Chart) return;

    const isDark = document.body.classList.contains('theme-dark');
    const textColor = isDark ? '#cbd5e1' : '#475569';

    // 1. Status Donut Chart
    const donutCtx = document.getElementById('statusDonutChart');
    if (donutCtx) {
      if (this.statusChart) this.statusChart.destroy();

      const counts = metrics.statusCounts;
      this.statusChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'In Progress', 'Pending', 'Blocked', 'Under Review'],
          datasets: [{
            data: [
              counts['Completed'] || 0,
              counts['In Progress'] || 0,
              counts['Pending'] || 0,
              counts['Blocked'] || 0,
              counts['Under Review'] || 0
            ],
            backgroundColor: [
              '#10b981', // Emerald
              '#3b82f6', // Blue
              '#f59e0b', // Amber
              '#ef4444', // Rose
              '#8b5cf6'  // Purple
            ],
            borderWidth: 2,
            borderColor: isDark ? '#131b2e' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { family: 'Inter', size: 12 } }
            }
          },
          cutout: '68%'
        }
      });
    }

    // 2. Project Hours Bar Chart
    const barCtx = document.getElementById('projectHoursBarChart');
    if (barCtx) {
      if (this.projectChart) this.projectChart.destroy();

      const projects = Object.keys(metrics.projectHoursMap);
      const hours = projects.map(p => metrics.projectHoursMap[p]);

      this.projectChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: projects.length > 0 ? projects : ['No data'],
          datasets: [{
            label: 'Hours Spent',
            data: hours.length > 0 ? hours : [0],
            backgroundColor: '#3b82f6',
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
              ticks: { color: textColor, font: { family: 'Inter' } },
              grid: { display: false }
            },
            y: {
              ticks: { color: textColor, font: { family: 'Inter' } },
              grid: { color: isDark ? '#243048' : '#e2e8f0' },
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

    // Month Stats
    const stats = manager.getMonthStats(year, month);
    document.getElementById('calStatWorkingDays').textContent = stats.workingDaysCount;
    document.getElementById('calStatCompleted').textContent = stats.completedCount;
    document.getElementById('calStatHours').textContent = `${stats.totalHours}h`;
    document.getElementById('calStatLeave').textContent = stats.leaveDaysCount;

    // Get Entries for this month
    const entriesMap = manager.getEntriesForMonth(year, month);

    grid.innerHTML = '';

    // Calculate start day (0=Sun, 1=Mon, ..., 6=Sat)
    let firstDayIndex = dateObj.getDay(); 
    // Shift to Mon=0, ..., Sun=6
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const todayStr = WorksheetManager.getTodayStr();

    // 1. Render Previous Month trailing days
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDate = prevMonthLastDay - x + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `
        <div class="day-header-row">
          <span class="day-number">${prevDate}</span>
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
      cell.className = 'calendar-day-cell';
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
        let statusCls = 'in-progress';
        if (task.status === 'Completed') statusCls = 'completed';
        else if (task.status === 'Pending') statusCls = 'pending';
        else if (task.status === 'Blocked') statusCls = 'blocked';
        else if (task.status === 'Leave') statusCls = 'leave';

        tasksHtml += `
          <div class="cal-task-pill ${statusCls}" title="${this.escapeHtml(task.projectName)}: ${this.escapeHtml(task.work)}">
            <span>${this.escapeHtml(task.projectName)}</span>
          </div>
        `;
      });

      if (dayEntries.length > 3) {
        tasksHtml += `<span class="cal-more-tag">+${dayEntries.length - 3} more</span>`;
      }

      cell.innerHTML = `
        <div class="day-header-row">
          <span class="day-number">${i}</span>
          ${totalDayHours > 0 ? `<span class="day-total-hours">${totalDayHours}h</span>` : ''}
        </div>
        <div class="day-tasks-container">
          ${tasksHtml}
        </div>
      `;

      cell.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('selected'));
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
      cell.className = 'calendar-day-cell other-month';
      cell.innerHTML = `
        <div class="day-header-row">
          <span class="day-number">${j}</span>
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
    title.textContent = `Tasks for ${UIRenderer.formatDisplayDate(dateStr)}`;

    // Add button handler
    addBtn.onclick = () => onAddForDate(dateStr);
    closeBtn.onclick = () => inspector.classList.add('hidden');

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

      item.innerHTML = `
        <div class="inspector-task-main">
          <div class="inspector-project">${this.escapeHtml(entry.projectName)}</div>
          <div class="inspector-work">${this.escapeHtml(entry.work).replace(/\n/g, '<br>')}</div>
          ${entry.remarks ? `<div class="work-remarks" style="margin-top: 4px;"><i data-lucide="info" class="icon-xs"></i> ${this.escapeHtml(entry.remarks)}</div>` : ''}
        </div>
        <div class="inspector-task-side">
          <select class="inline-status-select ${statusMeta.cls}" data-id="${entry.id}">
            <option value="Completed" ${entry.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
            <option value="In Progress" ${entry.status === 'In Progress' ? 'selected' : ''}>🔄 In Progress</option>
            <option value="Pending" ${entry.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="Blocked" ${entry.status === 'Blocked' ? 'selected' : ''}>🛑 Blocked</option>
            <option value="Under Review" ${entry.status === 'Under Review' ? 'selected' : ''}>🔍 Under Review</option>
            <option value="Leave" ${entry.status === 'Leave' ? 'selected' : ''}>🏖️ Leave / Off</option>
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
