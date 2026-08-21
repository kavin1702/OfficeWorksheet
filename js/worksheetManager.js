/**
 * Worksheet State & Business Logic Manager (WorkPulse)
 * Handles multi-user data segregation, filtering, sorting, stats, and pending task carry-forward.
 */

class WorksheetManager {
  constructor(cloudService) {
    this.storage = cloudService;
    this.entries = [];
    this.filters = {
      dateRange: 'this-month', // 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all' | 'custom'
      customStartDate: null,
      customEndDate: null,
      project: 'all',
      status: 'all',
      search: '',
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
        list = window.SAMPLE_WORKSHEET_DATA;
        await this.storage.batchImport(list);
      }
    } else {
      // Automatically migrate all work data to kavin@8chili.com
      let migrated = false;
      list.forEach(e => {
        if (!e.userId || e.userId === 'user_kavin' || e.userId === 'user_admin_mnkavin' || e.userName === 'Kavin' || e.userName === 'Kavin M' || !e.userName) {
          e.userId = 'user_8chili_kavin';
          e.userName = 'Kavin (8chili)';
          migrated = true;
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

  // Add new worksheet entry (tagged with active user)
  async addEntry(data) {
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
    const is8chili = currentUser && (currentUser.email === 'kavin@8chili.com' || currentUser.id === 'user_8chili_kavin');

    const newEntry = {
      id: this.generateId(),
      userId: currentUser ? (is8chili ? 'user_8chili_kavin' : currentUser.id) : 'user_8chili_kavin',
      userName: currentUser ? (is8chili ? 'Kavin (8chili)' : currentUser.name) : 'Kavin (8chili)',
      date: data.date || WorksheetManager.getTodayStr(),
      projectName: (data.projectName || 'General').trim(),
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
      userId: currentUser ? currentUser.id : (source.userId || 'user_kavin'),
      userName: currentUser ? currentUser.name : (source.userName || 'Kavin'),
      date: WorksheetManager.getTodayStr(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.entries.unshift(cloned);
    await this.storage.saveEntry(cloned);
    return cloned;
  }

  // Carry Forward all unfinished tasks from yesterday to today
  async carryForwardPendingTasks() {
    const yesterdayStr = WorksheetManager.getYesterdayStr();
    const todayStr = WorksheetManager.getTodayStr();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    // Find incomplete tasks
    const incompleteYesterday = this.entries.filter(e => {
      const isYesterday = e.date === yesterdayStr;
      const isIncomplete = e.status === 'In Progress' || e.status === 'Pending' || e.status === 'Blocked';
      const isUserMatch = !currentUser || this.isEntryBelongsToUser(e, currentUser);
      return isYesterday && isIncomplete && isUserMatch;
    });

    if (incompleteYesterday.length === 0) {
      return { count: 0, message: "No unfinished tasks found from yesterday." };
    }

    let addedCount = 0;
    for (const task of incompleteYesterday) {
      // Check if already logged today
      const alreadyLogged = this.entries.some(e => 
        e.date === todayStr && 
        e.projectName === task.projectName && 
        e.work === task.work &&
        (!currentUser || this.isEntryBelongsToUser(e, currentUser))
      );

      if (!alreadyLogged) {
        await this.addEntry({
          date: todayStr,
          userId: currentUser ? currentUser.id : task.userId,
          userName: currentUser ? currentUser.name : task.userName,
          projectName: task.projectName,
          work: task.work,
          status: 'In Progress',
          hoursWorked: 0,
          priority: task.priority || 'Medium',
          remarks: `Carried forward from yesterday`
        });
        addedCount++;
      }
    }

    return {
      count: addedCount,
      message: addedCount > 0 
        ? `Successfully carried forward ${addedCount} unfinished task(s) to today's worksheet!`
        : `All yesterday's unfinished tasks are already in today's worksheet.`
    };
  }

  // Helper: check if entry belongs to a user
  isEntryBelongsToUser(entry, user) {
    if (!user) return true;
    const email = (user.email || '').toLowerCase().trim();

    // kavin@8chili.com owns all daily worksheet records
    if (email === 'kavin@8chili.com') {
      if (entry.userId === 'user_8chili_kavin' || entry.userName === 'Kavin (8chili)' || entry.userName === 'Kavin' || entry.userName === 'Kavin M' || !entry.userId || entry.userId === 'user_kavin') {
        return true;
      }
      return entry.userId === user.id;
    }

    // mnkavin2006@gmail.com (Admin) personal worksheet
    if (email === 'mnkavin2006@gmail.com') {
      return entry.userId === 'user_admin_mnkavin' || entry.userName === 'Kavin M (Admin)';
    }

    if (entry.userId === user.id) return true;
    if (entry.userName && user.name && entry.userName.toLowerCase() === user.name.toLowerCase()) return true;
    return false;
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
    const set = new Set();
    const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;

    this.entries.forEach(e => {
      if (this.filters.userScope === 'me' && currentUser && !this.isEntryBelongsToUser(e, currentUser)) {
        return;
      }
      if (e.projectName && e.projectName.trim()) {
        set.add(e.projectName.trim());
      }
    });
    return Array.from(set).sort();
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

      // 5. Search keyword
      if (this.filters.search) {
        const q = this.filters.search.toLowerCase().trim();
        // If search query is an email or matches current user name/username/email, ignore or match user
        const isEmailOrUser = q.includes('@') || (currentUser && (
          (currentUser.email && currentUser.email.toLowerCase().includes(q)) ||
          (currentUser.name && currentUser.name.toLowerCase().includes(q))
        ));

        if (!isEmailOrUser) {
          const inProject = (entry.projectName || '').toLowerCase().includes(q);
          const inWork = (entry.work || '').toLowerCase().includes(q);
          const inRemarks = (entry.remarks || '').toLowerCase().includes(q);
          const inUser = (entry.userName || '').toLowerCase().includes(q);
          const inDate = (entry.date || '').toLowerCase().includes(q);
          if (!inProject && !inWork && !inRemarks && !inUser && !inDate) return false;
        }
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
    let leaveDaysCount = 0;
    let workingDaysSet = new Set();

    dateKeys.forEach(dateStr => {
      const dayTasks = entriesMap[dateStr];
      let dayHasWork = false;
      let dayIsLeave = false;

      dayTasks.forEach(task => {
        const hrs = parseFloat(task.hoursWorked) || 0;
        totalHours += hrs;
        if (task.status === 'Completed') completedCount++;
        if (task.status === 'Leave') dayIsLeave = true;
        if (task.status !== 'Leave') dayHasWork = true;
      });

      if (dayHasWork) workingDaysSet.add(dateStr);
      if (dayIsLeave && !dayHasWork) leaveDaysCount++;
    });

    return {
      workingDaysCount: workingDaysSet.size,
      completedCount,
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
    const projectHours = {};

    entries.forEach(e => {
      const hours = parseFloat(e.hoursWorked) || 0;
      totalHours += hours;

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
      completed,
      inProgress,
      pending,
      blocked,
      leave,
      completionRate,
      projectHours
    };
  }
}

window.WorksheetManager = WorksheetManager;
