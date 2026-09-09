/**
 * Worksheet State & Business Logic Manager (WorkPulse)
 * Handles multi-user data segregation, simulation matrix tracking, filtering, sorting, stats, and pending task carry-forward.
 */

class WorksheetManager {
  constructor(cloudService) {
    this.storage = cloudService;
    this.entries = [];
    this.filters = {
      dateRange: 'all', // Default to 'all' so historical simulation records are always visible
      customStartDate: null,
      customEndDate: null,
      project: 'all',
      status: 'all',
      search: '',
      workType: 'all', // 'all' | 'Worked' | 'Tested'
      userScope: 'me' // 'me' (current user) | 'all' (all team members) | specific userId
    };
    this.sort = {
      field: 'date',
      direction: 'desc' // 'asc' | 'desc'
    };
  }

  // Load initial entries from storage and ensure all tasks belong to kavin@8chili.com
  async initialize() {
    let list = await this.storage.fetchAll();
    if (!list || list.length === 0) {
      if (window.SAMPLE_WORKSHEET_DATA) {
        list = [...window.SAMPLE_WORKSHEET_DATA];
        await this.storage.batchImport(list);
      }
    } else {
      // Automatically migrate all work data to kavin@8chili.com and normalize dates & workTypes
      let migrated = false;
      list.forEach(e => {
        if (!e.userId || e.userId === 'user_kavin' || e.userId === 'user_admin_mnkavin' || e.userName === 'Kavin' || e.userName === 'Kavin M' || !e.userName) {
          e.userId = 'user_8chili_kavin';
          e.userName = 'Kavin (8chili)';
          migrated = true;
        }

        // Tag workType if missing
        if (!e.workType) {
          if (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(e.projectName)) {
            e.workType = 'Tested';
            migrated = true;
          } else {
            e.workType = 'Worked';
            migrated = true;
          }
        }

        // Normalize date
        if (e.date && this.storage && typeof this.storage.normalizeDate === 'function') {
          const nd = this.storage.normalizeDate(e.date);
          if (nd !== e.date) {
            e.date = nd;
            migrated = true;
          }
        }
      });

      if (migrated) {
        await this.storage.batchImport(list);
      }
    }
    this.entries = list || [];
    return this.entries;
  }

  // Generate unique ID
  generateId() {
    return 'work-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
  }

  // Helper: Format Date to YYYY-MM-DD
  static formatDateIso(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper: Get Today's Date String
  static getTodayStr() {
    return WorksheetManager.formatDateIso(new Date());
  }

  // Helper: Get Yesterday's Date String
  static getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return WorksheetManager.formatDateIso(d);
  }

  // Add new worksheet entry (tagged with active user and workType)
  async addEntry(data) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const is8chili = currentUser && (currentUser.email === 'kavin@8chili.com' || currentUser.id === 'user_8chili_kavin');

    const projName = (data.projectName || 'General').trim();
    let determinedType = data.workType;
    if (!determinedType) {
      if (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(projName)) {
        determinedType = 'Tested';
      } else if (window.SIMULATIONS_WORKED_ON && window.SIMULATIONS_WORKED_ON.includes(projName)) {
        determinedType = 'Worked';
      } else {
        determinedType = 'Worked';
      }
    }

    const newEntry = {
      id: this.generateId(),
      userId: currentUser ? (is8chili ? 'user_8chili_kavin' : currentUser.id) : 'user_8chili_kavin',
      userName: currentUser ? (is8chili ? 'Kavin (8chili)' : currentUser.name) : 'Kavin (8chili)',
      date: data.date || WorksheetManager.getTodayStr(),
      projectName: projName,
      workType: determinedType,
      work: (data.work || '').trim(),
      status: data.status || 'In Progress',
      hoursWorked: parseFloat(data.hoursWorked) || 0,
      priority: data.priority || 'Medium',
      remarks: (data.remarks || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.entries.unshift(newEntry);
    await this.storage.saveEntry(newEntry);
    return newEntry;
  }

  // Update existing entry
  async updateEntry(id, updates) {
    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Entry not found');

    const updatedEntry = {
      ...this.entries[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.entries[index] = updatedEntry;
    await this.storage.saveEntry(updatedEntry);
    return updatedEntry;
  }

  // Quick Status change
  async updateStatus(id, newStatus) {
    return await this.updateEntry(id, { status: newStatus });
  }

  // Delete entry
  async deleteEntry(id) {
    const index = this.entries.findIndex(e => e.id === id);
    if (index === -1) return false;

    this.entries.splice(index, 1);
    await this.storage.deleteEntry(id);
    return true;
  }

  // Duplicate an entry into today's log
  async duplicateEntry(id) {
    const source = this.entries.find(e => e.id === id);
    if (!source) throw new Error('Source entry not found');

    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    const cloned = {
      ...source,
      id: this.generateId(),
      date: WorksheetManager.getTodayStr(),
      status: 'In Progress',
      userId: currentUser ? currentUser.id : source.userId,
      userName: currentUser ? currentUser.name : source.userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.entries.unshift(cloned);
    await this.storage.saveEntry(cloned);
    return cloned;
  }

  // Carry Forward Unfinished (Pending / In Progress / Blocked) Tasks
  async carryForwardPendingTasks() {
    const todayStr = WorksheetManager.getTodayStr();
    const unfinishedStatuses = ['In Progress', 'Pending', 'Blocked', 'Under Review'];
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    const sourceTasks = this.entries.filter(e => {
      if (e.date >= todayStr) return false;
      if (!unfinishedStatuses.includes(e.status)) return false;
      if (this.filters.userScope === 'me' && currentUser) {
        return this.isEntryBelongsToUser(e, currentUser);
      }
      return true;
    });

    if (sourceTasks.length === 0) {
      return { count: 0, message: 'No unfinished past tasks to carry forward.' };
    }

    const todayTaskSignatures = new Set(
      this.entries
        .filter(e => e.date === todayStr)
        .map(e => `${(e.projectName||'').toLowerCase()}__${(e.work||'').toLowerCase()}`)
    );

    let addedCount = 0;
    const newItems = [];

    for (const task of sourceTasks) {
      const sig = `${(task.projectName||'').toLowerCase()}__${(task.work||'').toLowerCase()}`;
      if (!todayTaskSignatures.has(sig)) {
        const clonedTask = {
          id: this.generateId(),
          userId: task.userId,
          userName: task.userName,
          date: todayStr,
          projectName: task.projectName,
          workType: task.workType || 'Worked',
          work: task.work,
          status: 'In Progress',
          hoursWorked: 0,
          priority: task.priority || 'Medium',
          remarks: `[Carried from ${task.date}] ${task.remarks || ''}`.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        newItems.push(clonedTask);
        todayTaskSignatures.add(sig);
        addedCount++;
      }
    }

    if (newItems.length > 0) {
      this.entries.unshift(...newItems);
      for (const item of newItems) {
        await this.storage.saveEntry(item);
      }
    }

    return {
      count: addedCount,
      message: addedCount > 0 
        ? `Successfully carried forward ${addedCount} unfinished task(s) to today's worksheet!`
        : `All yesterday's unfinished tasks are already in today's worksheet.`
    };
  }

  isEntryBelongsToUser(entry, user) {
    if (!user) return true;
    const email = (user.email || '').toLowerCase().trim();

    // kavin@8chili.com owns all daily worksheet records
    if (email === 'kavin@8chili.com' || user.id === 'user_8chili_kavin' || (user.name && user.name.toLowerCase().includes('kavin') && !user.name.toLowerCase().includes('admin'))) {
      if (entry.userId === 'user_8chili_kavin' || entry.userName === 'Kavin (8chili)' || entry.userName === 'Kavin' || entry.userName === 'Kavin M' || !entry.userId || entry.userId === 'user_kavin') {
        return true;
      }
      return entry.userId === user.id;
    }

    // mnkavin2006@gmail.com (Admin) personal worksheet
    if (email === 'mnkavin2006@gmail.com' || user.id === 'user_admin_mnkavin') {
      return entry.userId === 'user_admin_mnkavin' || entry.userName === 'Kavin M (Admin)';
    }

    if (entry.userId === user.id) return true;
    if (entry.userName && user.name && entry.userName.toLowerCase() === user.name.toLowerCase()) return true;
    return true;
  }

  // Set filter value
  setFilter(key, value) {
    this.filters[key] = value;
  }

  // Set sorting
  setSort(field) {
    if (this.sort.field === field) {
      this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort.field = field;
      this.sort.direction = 'desc';
    }
  }

  // Get distinct list of project names for filter dropdown & auto-suggestions
  getUniqueProjects() {
    const workedSet = new Set(window.SIMULATIONS_WORKED_ON || []);
    const testedSet = new Set(window.SIMULATIONS_TESTED || []);
    const customSet = new Set();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    this.entries.forEach(e => {
      if (this.filters.userScope === 'me' && currentUser && !this.isEntryBelongsToUser(e, currentUser)) {
        return;
      }
      if (e.projectName && e.projectName.trim()) {
        const p = e.projectName.trim();
        if (!workedSet.has(p) && !testedSet.has(p)) {
          customSet.add(p);
        }
      }
    });

    return {
      worked: Array.from(workedSet),
      tested: Array.from(testedSet),
      custom: Array.from(customSet).sort()
    };
  }

  // Get distinct list of all dates in records
  getUniqueDates() {
    const set = new Set();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    this.entries.forEach(e => {
      if (this.filters.userScope === 'me' && currentUser && !this.isEntryBelongsToUser(e, currentUser)) {
        return;
      }
      if (e.date) set.add(e.date);
    });
    return Array.from(set).sort().reverse();
  }

  // Get filtered and sorted worksheet records
  getFilteredEntries() {
    const todayStr = WorksheetManager.getTodayStr();
    const yesterdayStr = WorksheetManager.getYesterdayStr();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    // Date range boundaries
    let startDate = null;
    let endDate = null;

    if (this.filters.dateRange === 'today') {
      startDate = todayStr;
      endDate = todayStr;
    } else if (this.filters.dateRange === 'yesterday') {
      startDate = yesterdayStr;
      endDate = yesterdayStr;
    } else if (this.filters.dateRange === 'this-week') {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      startDate = WorksheetManager.formatDateIso(monday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      endDate = WorksheetManager.formatDateIso(sunday);
    } else if (this.filters.dateRange === 'this-month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startDate = WorksheetManager.formatDateIso(firstDay);
      endDate = WorksheetManager.formatDateIso(lastDay);

      // Fallback: If device date differs from worksheet data month, ensure August 2026 is visible
      const hasMonthRecords = this.entries.some(e => e.date && e.date >= startDate && e.date <= endDate);
      if (!hasMonthRecords && this.entries.some(e => e.date && e.date.startsWith('2026-08'))) {
        startDate = '2026-08-01';
        endDate = '2026-08-31';
      }
    } else if (this.filters.dateRange === 'all') {
      startDate = null;
      endDate = null;
    } else if (this.filters.dateRange === 'custom') {
      startDate = this.filters.customStartDate;
      endDate = this.filters.customEndDate;
    }

    const filtered = this.entries.filter(entry => {
      // 1. User Isolation Filter
      if (this.filters.userScope === 'me' && currentUser) {
        if (!this.isEntryBelongsToUser(entry, currentUser)) return false;
      } else if (this.filters.userScope !== 'all' && this.filters.userScope) {
        if (entry.userId !== this.filters.userScope) return false;
      }

      // 2. Date filter
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;

      // 3. Project filter
      if (this.filters.project !== 'all' && entry.projectName !== this.filters.project) {
        return false;
      }

      // 4. Status filter
      if (this.filters.status !== 'all' && entry.status !== this.filters.status) {
        return false;
      }

      // 5. WorkType filter ('Worked' vs 'Tested')
      if (this.filters.workType && this.filters.workType !== 'all') {
        const eType = entry.workType || 'Worked';
        if (eType.toLowerCase() !== this.filters.workType.toLowerCase()) return false;
      }

      // 6. Search query
      if (this.filters.search && this.filters.search.trim()) {
        const q = this.filters.search.toLowerCase().trim();
        const textToSearch = `${entry.projectName || ''} ${entry.work || ''} ${entry.remarks || ''} ${entry.status || ''} ${entry.userName || ''}`.toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[this.sort.field];
      let valB = b[this.sort.field];

      if (this.sort.field === 'date') {
        valA = valA || '';
        valB = valB || '';
        return this.sort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      if (this.sort.field === 'hoursWorked') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
        return this.sort.direction === 'asc' ? valA - valB : valB - valA;
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return this.sort.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return 0;
    });

    return filtered;
  }

  // Monthly breakdown for calendar
  getEntriesForMonth(year, month) {
    const monthMap = {};
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    this.entries.forEach(entry => {
      if (this.filters.userScope === 'me' && currentUser && !this.isEntryBelongsToUser(entry, currentUser)) {
        return;
      }
      if (!entry.date) return;
      const parts = entry.date.split('-');
      if (parts.length >= 3) {
        const eYear = parseInt(parts[0], 10);
        const eMonth = parseInt(parts[1], 10) - 1; // 0-indexed
        if (eYear === year && eMonth === month) {
          if (!monthMap[entry.date]) {
            monthMap[entry.date] = [];
          }
          monthMap[entry.date].push(entry);
        }
      }
    });

    return monthMap;
  }

  // Get entries for specific date
  getEntriesForDate(dateStr) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    return this.entries.filter(e => {
      if (this.filters.userScope === 'me' && currentUser && !this.isEntryBelongsToUser(e, currentUser)) {
        return false;
      }
      return e.date === dateStr;
    });
  }

  // Calculate monthly stats for calendar summary
  getMonthStats(year, month) {
    const entriesMap = this.getEntriesForMonth(year, month);
    const dateKeys = Object.keys(entriesMap);
    
    let totalHours = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let totalTasks = 0;
    let leaveDaysCount = 0;
    let workingDaysSet = new Set();

    dateKeys.forEach(dateStr => {
      const dayTasks = entriesMap[dateStr];
      let dayHasWork = false;
      let dayIsLeave = false;

      dayTasks.forEach(task => {
        totalTasks++;
        const hrs = parseFloat(task.hoursWorked) || 0;
        totalHours += hrs;
        if (task.status === 'Completed') completedCount++;
        else if (task.status !== 'Leave') pendingCount++;
        if (task.status === 'Leave') dayIsLeave = true;
        if (task.status !== 'Leave') dayHasWork = true;
      });

      if (dayHasWork) workingDaysSet.add(dateStr);
      if (dayIsLeave && !dayHasWork) leaveDaysCount++;
    });

    return {
      workingDaysCount: workingDaysSet.size,
      completedCount,
      pendingCount,
      totalTasks,
      totalHours: totalHours.toFixed(1),
      leaveDaysCount
    };
  }

  // Compute aggregate dashboard metrics
  getMetrics(entries = this.getFilteredEntries()) {
    let totalHours = 0;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let blocked = 0;
    let leave = 0;
    let totalWorkedHours = 0;
    let totalTestedHours = 0;
    let totalWorkedTasks = 0;
    let totalTestedTasks = 0;
    const projectHours = {};

    entries.forEach(e => {
      const hours = parseFloat(e.hoursWorked) || 0;
      totalHours += hours;

      const isTest = (e.workType === 'Tested') || (window.SIMULATIONS_TESTED && window.SIMULATIONS_TESTED.includes(e.projectName));
      if (isTest) {
        totalTestedHours += hours;
        totalTestedTasks++;
      } else {
        totalWorkedHours += hours;
        totalWorkedTasks++;
      }

      if (e.status === 'Completed') completed++;
      else if (e.status === 'In Progress') inProgress++;
      else if (e.status === 'Pending') pending++;
      else if (e.status === 'Blocked') blocked++;
      else if (e.status === 'Leave') leave++;

      const pName = e.projectName || 'General';
      projectHours[pName] = (projectHours[pName] || 0) + hours;
    });

    const totalTasks = entries.length;
    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return {
      totalTasks,
      totalHours: totalHours.toFixed(1),
      totalWorkedHours: totalWorkedHours.toFixed(1),
      totalTestedHours: totalTestedHours.toFixed(1),
      totalWorkedTasks,
      totalTestedTasks,
      completed,
      inProgress,
      pending,
      blocked,
      leave,
      completionRate,
      projectHours
    };
  }

  // Comprehensive Simulation Matrix Tracker (12 Worked On + 7 Tested)
  getSimulationMatrix() {
    const workedCatalogs = window.SIMULATIONS_WORKED_ON || [];
    const testedCatalogs = window.SIMULATIONS_TESTED || [];
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    const userEntries = this.entries.filter(e => {
      if (this.filters.userScope === 'me' && currentUser) {
        return this.isEntryBelongsToUser(e, currentUser);
      }
      return true;
    });

    const matrixWorked = workedCatalogs.map((name, index) => {
      const matched = userEntries.filter(e => e.projectName === name && (e.workType !== 'Tested'));
      const hours = matched.reduce((acc, cur) => acc + (parseFloat(cur.hoursWorked) || 0), 0);
      const completed = matched.filter(e => e.status === 'Completed').length;
      return {
        num: index + 1,
        name,
        type: 'Worked',
        totalTasks: matched.length,
        completedTasks: completed,
        totalHours: hours.toFixed(1),
        progress: matched.length > 0 ? Math.round((completed / matched.length) * 100) : 0
      };
    });

    const matrixTested = testedCatalogs.map((name, index) => {
      const matched = userEntries.filter(e => e.projectName === name && (e.workType === 'Tested' || !e.workType));
      const hours = matched.reduce((acc, cur) => acc + (parseFloat(cur.hoursWorked) || 0), 0);
      const completed = matched.filter(e => e.status === 'Completed').length;
      return {
        num: index + 1,
        name,
        type: 'Tested',
        totalTasks: matched.length,
        completedTasks: completed,
        totalHours: hours.toFixed(1),
        progress: matched.length > 0 ? Math.round((completed / matched.length) * 100) : 0
      };
    });

    return {
      worked: matrixWorked,
      tested: matrixTested,
      summary: {
        totalWorkedCount: workedCatalogs.length,
        activeWorkedCount: matrixWorked.filter(m => m.totalTasks > 0).length,
        totalTestedCount: testedCatalogs.length,
        activeTestedCount: matrixTested.filter(m => m.totalTasks > 0).length
      }
    };
  }
}

window.WorksheetManager = WorksheetManager;