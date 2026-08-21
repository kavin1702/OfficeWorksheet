/**
 * Admin Management & Multi-User Governance Module (WorkPulse)
 * Dedicated Admin Portal for inspecting team members, monitoring dual-sync,
 * auditing user tasks, and exporting consolidated reports.
 */

class AdminManager {
  constructor(worksheetManager, authManager, uiRenderer) {
    this.wm = worksheetManager;
    this.auth = authManager;
    this.ui = uiRenderer;
    this.inspectedUser = null;
  }

  // Calculate high-level team metrics
  getTeamMetrics() {
    const users = this.auth.getAllUsers();
    const allEntries = this.wm.entries || [];

    const totalUsers = users.length;
    const totalTasks = allEntries.length;
    const totalHours = allEntries.reduce((sum, e) => sum + (parseFloat(e.hoursWorked) || 0), 0);
    const completedTasks = allEntries.filter(e => e.status === 'Completed').length;
    const inProgressTasks = allEntries.filter(e => e.status === 'In Progress').length;
    const pendingTasks = allEntries.filter(e => e.status === 'Pending').length;

    return {
      totalUsers,
      totalTasks,
      totalHours: Math.round(totalHours * 10) / 10,
      completedTasks,
      inProgressTasks,
      pendingTasks
    };
  }

  // Get detailed stats per user
  getUsersSummary() {
    const users = this.auth.getAllUsers();
    const allEntries = this.wm.entries || [];

    return users.map(user => {
      const userEntries = allEntries.filter(e => this.wm.isEntryBelongsToUser(e, user));
      const hours = userEntries.reduce((sum, e) => sum + (parseFloat(e.hoursWorked) || 0), 0);
      const completed = userEntries.filter(e => e.status === 'Completed').length;
      const dates = userEntries.map(e => e.date).filter(Boolean).sort().reverse();
      const lastActive = dates.length > 0 ? dates[0] : 'No activity';

      return {
        ...user,
        totalTasks: userEntries.length,
        totalHours: Math.round(hours * 10) / 10,
        completedCount: completed,
        lastActive,
        entries: userEntries
      };
    });
  }

  // Render Admin Dashboard HTML
  renderAdminDashboard(containerId = 'adminDashboardContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const metrics = this.getTeamMetrics();
    const userSummaries = this.getUsersSummary();
    const cloudCfg = window.cloudStorage ? window.cloudStorage.config : {};

    const isSheetsConnected = !!cloudCfg.googleSheetUrl;
    const isNeonConnected = !!cloudCfg.neonDbUrl;

    container.innerHTML = `
      <!-- Admin KPI Metric Cards -->
      <div class="admin-kpi-grid">
        <div class="admin-kpi-card">
          <div class="admin-kpi-icon bg-blue-light text-blue"><i data-lucide="users"></i></div>
          <div class="admin-kpi-info">
            <span class="admin-kpi-val">${metrics.totalUsers}</span>
            <span class="admin-kpi-label">Registered Members</span>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-icon bg-emerald-light text-emerald"><i data-lucide="check-circle-2"></i></div>
          <div class="admin-kpi-info">
            <span class="admin-kpi-val">${metrics.completedTasks} / ${metrics.totalTasks}</span>
            <span class="admin-kpi-label">Tasks Completed</span>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-icon bg-purple-light text-purple"><i data-lucide="clock"></i></div>
          <div class="admin-kpi-info">
            <span class="admin-kpi-val">${metrics.totalHours}h</span>
            <span class="admin-kpi-label">Total Hours Logged</span>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div class="admin-kpi-icon bg-amber-light text-amber"><i data-lucide="database"></i></div>
          <div class="admin-kpi-info">
            <span class="admin-kpi-val" style="font-size: 0.95rem; font-weight: 700; color: #10b981;">
              ${isNeonConnected ? '⚡ Dual-Sync Active' : '📊 Google Sheets'}
            </span>
            <span class="admin-kpi-label">Cloud Storage Status</span>
          </div>
        </div>
      </div>

      <!-- Admin Actions Bar -->
      <div class="admin-header-actions">
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0;">👥 Team Members Directory</h3>
          <p style="font-size: 0.8125rem; color: var(--text-muted); margin: 0.2rem 0 0 0;">Manage users and inspect individual daily worksheets</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btnAdminExportMasterExcel" class="btn btn-primary btn-sm btn-glow">
            <i data-lucide="download"></i>
            <span>Export Master Team Excel</span>
          </button>
        </div>
      </div>

      <!-- Users Directory Table -->
      <div class="table-responsive-wrapper" style="margin-top: 1rem;">
        <table class="worksheet-table admin-users-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email Address</th>
              <th>Role</th>
              <th>Tasks Logged</th>
              <th>Total Hours</th>
              <th>Last Active</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${userSummaries.map(u => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <div class="user-avatar-badge" style="background-color: ${u.color || '#3b82f6'}; width: 28px; height: 28px; font-size: 0.75rem;">
                      ${u.avatar || u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong style="color: var(--text-primary); font-size: 0.85rem;">${this.escapeHtml(u.name)}</strong>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">@${this.escapeHtml(u.username || 'user')}</div>
                    </div>
                  </div>
                </td>
                <td><code style="font-size: 0.78rem;">${this.escapeHtml(u.email)}</code></td>
                <td>
                  <span class="badge ${u.role === 'Admin' ? 'badge-primary' : 'badge-neutral'}" style="font-size: 0.72rem;">
                    ${u.role === 'Admin' ? '👑 Admin' : '👤 ' + this.escapeHtml(u.role || 'Member')}
                  </span>
                </td>
                <td><strong>${u.totalTasks}</strong> tasks</td>
                <td><span class="hours-badge">${u.totalHours}h</span></td>
                <td><span style="font-size: 0.78rem; color: var(--text-muted);">${u.lastActive}</span></td>
                <td style="text-align: right;">
                  <button class="btn btn-outline btn-xs btn-inspect-user" data-user-id="${u.id}" title="Inspect Worksheet">
                    <i data-lucide="eye" class="icon-xs"></i>
                    <span>Inspect</span>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Inspected User Section (Hidden until user clicks Inspect) -->
      <div id="adminUserInspectorArea" class="admin-inspector-card hidden" style="margin-top: 1.5rem;">
        <div class="admin-inspector-header">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <div id="inspectorUserAvatar" class="user-avatar-badge" style="width: 32px; height: 32px;">K</div>
            <div>
              <h4 id="inspectorUserName" style="margin: 0; font-size: 1rem;">User Worksheet</h4>
              <span id="inspectorUserEmail" style="font-size: 0.75rem; color: var(--text-muted);"></span>
            </div>
          </div>
          <button id="btnCloseInspector" class="btn btn-ghost btn-xs"><i data-lucide="x"></i></button>
        </div>
        <div id="inspectorTableContainer" style="margin-top: 1rem;"></div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindAdminEvents();
  }

  // Bind Admin dashboard interactive events
  bindAdminEvents() {
    // 1. Export Master Excel
    const btnMasterExcel = document.getElementById('btnAdminExportMasterExcel');
    if (btnMasterExcel) {
      btnMasterExcel.addEventListener('click', () => this.exportMasterTeamExcel());
    }

    // 2. Inspect User Buttons
    document.querySelectorAll('.btn-inspect-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.userId;
        this.inspectUser(userId);
      });
    });

    // 3. Close Inspector
    const btnCloseInspector = document.getElementById('btnCloseInspector');
    if (btnCloseInspector) {
      btnCloseInspector.addEventListener('click', () => {
        const area = document.getElementById('adminUserInspectorArea');
        if (area) area.classList.add('hidden');
      });
    }
  }

  // Inspect specific user's worksheet
  inspectUser(userId) {
    const users = this.auth.getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const allEntries = this.wm.entries || [];
    const userEntries = allEntries.filter(e => this.wm.isEntryBelongsToUser(e, user));

    const inspectorArea = document.getElementById('adminUserInspectorArea');
    const avatarEl = document.getElementById('inspectorUserAvatar');
    const nameEl = document.getElementById('inspectorUserName');
    const emailEl = document.getElementById('inspectorUserEmail');
    const tableEl = document.getElementById('inspectorTableContainer');

    if (!inspectorArea) return;

    avatarEl.style.backgroundColor = user.color || '#3b82f6';
    avatarEl.textContent = user.avatar || user.name.charAt(0).toUpperCase();
    nameEl.textContent = `${user.name}'s Worksheet (${userEntries.length} tasks)`;
    emailEl.textContent = `${user.email} • Role: ${user.role}`;

    if (userEntries.length === 0) {
      tableEl.innerHTML = `<div class="empty-state-wrap"><p>No worksheet tasks recorded yet for this member.</p></div>`;
    } else {
      tableEl.innerHTML = `
        <table class="worksheet-table" style="font-size: 0.8rem; width: 100%;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Project</th>
              <th>Work Description</th>
              <th>Status</th>
              <th>Hours</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${userEntries.map(e => `
              <tr>
                <td><strong>${e.date}</strong></td>
                <td><span class="project-pill">${this.escapeHtml(e.projectName)}</span></td>
                <td>${this.escapeHtml(e.work)}</td>
                <td><span class="status-badge status-${(e.status||'').toLowerCase().replace(/\s+/g, '-')}">${e.status}</span></td>
                <td><strong>${e.hoursWorked}h</strong></td>
                <td><span style="font-size: 0.75rem; color: var(--text-muted);">${this.escapeHtml(e.remarks || '-')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    inspectorArea.classList.remove('hidden');
    inspectorArea.scrollIntoView({ behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  }

  // Export Consolidated Multi-User Excel
  exportMasterTeamExcel() {
    if (!window.XLSX) {
      this.ui.showToast('Excel exporter library not loaded', 'error');
      return;
    }

    const allEntries = this.wm.entries || [];
    const users = this.auth.getAllUsers();

    const rows = allEntries.map(e => ({
      'Member Name': e.userName || 'Kavin',
      'Date': e.date,
      'Project Name': e.projectName,
      'Work Description': e.work,
      'Status': e.status,
      'Hours': e.hoursWorked || 0,
      'Priority': e.priority || 'Medium',
      'Remarks': e.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'All Members Worksheet');

    const fileName = `WorkPulse_Master_Team_Report_${WorksheetManager.getTodayStr()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    this.ui.showToast(`Master Team Excel exported successfully!`, 'success');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.AdminManager = AdminManager;
