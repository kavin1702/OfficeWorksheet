/**
 * Worksheet State & Business Logic Manager
 * Handles data mutations, filtering, sorting, statistics, and pending task carry-forward.
 */

class WorksheetManager {
  constructor(cloudService) {
    this.storage = cloudService;
    this.entries = [];
    this.filters = {
      dateRange: 'today', // 'today' | 'yesterday' | 'this-week' | 'this-month' | 'all' | 'custom'
      customStartDate: null,
      customEndDate: null,
      project: 'all',
      status: 'all',
      search: ''
    };
    this.sort = {
      field: 'date',
      direction: 'desc' // 'asc' | 'desc'
    };
  }

  // Load initial entries from storage
  async initialize() {
    this.entries = await this.storage.fetchAll();
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

  // Add new worksheet entry
  async addEntry(data) {
    const newEntry = {
      id: this.generateId(),
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

  // Duplicate an existing task into today
  async duplicateEntry(id) {
    const source = this.entries.find(e => e.id === id);
    if (!source) return null;

    const cloned = {
      date: WorksheetManager.getTodayStr(),
      projectName: source.projectName,
      work: source.work,
      status: 'In Progress',
      hoursWorked: source.hoursWorked,
      priority: source.priority,
      remarks: source.remarks ? `Continuation: ${source.remarks}` : 'Continuation'
    };

    return await this.addEntry(cloned);
  }

  // Carry forward all unfinished (In Progress, Pending, Blocked) tasks from yesterday to today
  async carryForwardPendingTasks() {
    const yesterdayStr = WorksheetManager.getYesterdayStr();
    const todayStr = WorksheetManager.getTodayStr();

    // Find unfinished tasks from yesterday
    const unfinishedYesterday = this.entries.filter(e => 
      e.date === yesterdayStr && (e.status === 'In Progress' || e.status === 'Pending' || e.status === 'Blocked')
    );

    if (unfinishedYesterday.length === 0) {
      return { count: 0, message: 'No unfinished tasks found from yesterday.' };
    }

    let addedCount = 0;
    for (const task of unfinishedYesterday) {
      // Check if already added today with same work description
      const alreadyExists = this.entries.some(e => e.date === todayStr && e.projectName === task.projectName && e.work === task.work);
      if (!alreadyExists) {
        await this.addEntry({
          date: todayStr,
          projectName: task.projectName,
          work: task.work,
          status: task.status,
          hoursWorked: 0, // Reset hours for today
          priority: task.priority,
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
    this.entries.forEach(e => {
      if (e.projectName && e.projectName.trim()) {
        set.add(e.projectName.trim());
      }
    });
    return Array.from(set).sort();
  }

  // Get distinct list of all dates in records
  getUniqueDates() {
    const set = new Set();
    this.entries.forEach(e => {
      if (e.date) set.add(e.date);
    });
    return Array.from(set).sort().reverse();
  }

  // Get filtered and sorted worksheet records
  getFilteredEntries() {
    const todayStr = WorksheetManager.getTodayStr();
    const yesterdayStr = WorksheetManager.getYesterdayStr();

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
      const day = now.getDay(); // 0 is Sun, 1 is Mon...
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
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
      // Date filter
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;

      // Project filter
      if (this.filters.project !== 'all' && entry.projectName !== this.filters.project) {
        return false;
      }

      // Status filter
      if (this.filters.status !== 'all' && entry.status !== this.filters.status) {
        return false;
      }

      // Search keyword
      if (this.filters.search) {
        const query = this.filters.search.toLowerCase();
        const matchProject = entry.projectName.toLowerCase().includes(query);
        const matchWork = entry.work.toLowerCase().includes(query);
        const matchRemarks = (entry.remarks || '').toLowerCase().includes(query);
        const matchStatus = entry.status.toLowerCase().includes(query);
        if (!matchProject && !matchWork && !matchRemarks && !matchStatus) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let valA = a[this.sort.field];
      let valB = b[this.sort.field];

      if (this.sort.field === 'hours') {
        valA = a.hoursWorked || 0;
        valB = b.hoursWorked || 0;
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return this.sort.direction === 'asc' ? cmp : -cmp;
      }

      return this.sort.direction === 'asc' ? (valA - valB) : (valB - valA);
    });

    return filtered;
  }

  // Calculate high-level summary metrics for filtered set
  getMetrics(entries = this.getFilteredEntries()) {
    const totalTasks = entries.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let blockedCount = 0;
    let underReviewCount = 0;
    let leaveCount = 0;
    let totalHours = 0;
    const projectHoursMap = {};

    entries.forEach(e => {
      if (e.status === 'Completed') completedCount++;
      else if (e.status === 'In Progress') inProgressCount++;
      else if (e.status === 'Pending') pendingCount++;
      else if (e.status === 'Blocked') blockedCount++;
      else if (e.status === 'Under Review') underReviewCount++;
      else if (e.status === 'Leave') leaveCount++;

      const hrs = parseFloat(e.hoursWorked) || 0;
      totalHours += hrs;

      const pName = e.projectName || 'General';
      projectHoursMap[pName] = (projectHoursMap[pName] || 0) + hrs;
    });

    const activeTasks = totalTasks - leaveCount;
    const completionRate = activeTasks > 0 ? Math.round((completedCount / activeTasks) * 100) : (completedCount > 0 ? 100 : 0);

    return {
      totalTasks,
      completedCount,
      inProgressCount,
      pendingCount,
      blockedCount,
      underReviewCount,
      leaveCount,
      completionRate,
      totalHours: parseFloat(totalHours.toFixed(1)),
      projectHoursMap,
      statusCounts: {
        'Completed': completedCount,
        'In Progress': inProgressCount,
        'Pending': pendingCount,
        'Blocked': blockedCount,
        'Under Review': underReviewCount,
        'Leave': leaveCount
      }
    };
  }

  // Get entries mapped by date string for a specific month (year, month 0-11)
  getEntriesForMonth(year, month) {
    const monthStr = String(month + 1).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const dateMap = {};

    this.entries.forEach(entry => {
      if (entry.date && entry.date.startsWith(prefix)) {
        if (!dateMap[entry.date]) dateMap[entry.date] = [];
        dateMap[entry.date].push(entry);
      }
    });

    return dateMap;
  }

  // Get all entries for a specific day YYYY-MM-DD
  getEntriesForDate(dateStr) {
    return this.entries.filter(e => e.date === dateStr);
  }

  // Get Month Summary Stats
  getMonthStats(year, month) {
    const monthStr = String(month + 1).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const monthEntries = this.entries.filter(e => e.date && e.date.startsWith(prefix));
    
    const uniqueDays = new Set();
    let totalHours = 0;
    let completedCount = 0;
    let leaveDays = new Set();

    monthEntries.forEach(e => {
      if (e.status === 'Leave') {
        leaveDays.add(e.date);
      } else {
        uniqueDays.add(e.date);
        totalHours += (parseFloat(e.hoursWorked) || 0);
        if (e.status === 'Completed') completedCount++;
      }
    });

    return {
      totalEntries: monthEntries.length,
      workingDaysCount: uniqueDays.size,
      leaveDaysCount: leaveDays.size,
      totalHours: parseFloat(totalHours.toFixed(1)),
      completedCount
    };
  }
}

window.WorksheetManager = WorksheetManager;
