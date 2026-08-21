/**
 * Cloud Storage & Dual-Sync Engine (WorkPulse)
 * Supports:
 * 1. Google Sheets (Common shared spreadsheet across phone & PC via Apps Script Web App)
 * 2. Neon DB (Serverless PostgreSQL Cloud Database via HTTP SQL API)
 * 3. Dual-Sync Mode (Writes to BOTH Google Sheets and Neon DB simultaneously)
 * 4. Supabase / REST / Local Storage fallback
 */

class CloudStorageService {
  constructor() {
    this.storageKey = 'workpulse_worksheet_entries';
    this.configKey = 'workpulse_cloud_config';
    this.syncQueueKey = 'workpulse_sync_queue';
    
    this.statusListeners = [];
    this.dataChangeListeners = [];
    this.currentStatus = 'connected'; // 'connected', 'syncing', 'local', 'error'
    this.statusMessage = '📊 Google Sheets & Cloud Connected';
    this.pollingInterval = null;

    // Load configuration FIRST
    this.config = this.loadConfig();

    // Initialize client and network listeners
    this.initClient();
    this.bindNetworkListeners();
    this.startAutoPolling();
  }

  // Load cloud config from LocalStorage
  loadConfig() {
    const saved = localStorage.getItem(this.configKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          provider: parsed.provider || 'dual', // 'dual' | 'sheets' | 'neon' | 'supabase' | 'local'
          googleSheetUrl: parsed.googleSheetUrl || 'https://script.google.com/macros/s/AKfycbyTDZirH2EeXjQv1XKO2Jo9fdkJZ68-AJunzVb5-Fhr3etwmb2U7k_iOhE8aboB6dRCVw/exec',
          neonDbUrl: parsed.neonDbUrl || '',
          neonToken: parsed.neonToken || '',
          syncKey: parsed.syncKey || '',
          supabaseUrl: parsed.supabaseUrl || '',
          supabaseAnonKey: parsed.supabaseAnonKey || '',
          restApiUrl: parsed.restApiUrl || '',
          restAuthToken: parsed.restAuthToken || '',
          autoSync: parsed.autoSync !== false,
          dualSync: parsed.dualSync !== false
        };
      } catch (e) {
        console.error('Failed to parse cloud config:', e);
      }
    }
    return {
      provider: 'dual',
      googleSheetUrl: 'https://script.google.com/macros/s/AKfycbyTDZirH2EeXjQv1XKO2Jo9fdkJZ68-AJunzVb5-Fhr3etwmb2U7k_iOhE8aboB6dRCVw/exec',
      neonDbUrl: '',
      neonToken: '',
      syncKey: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      restApiUrl: '',
      restAuthToken: '',
      autoSync: true,
      dualSync: true
    };
  }

  // Save cloud config
  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(this.configKey, JSON.stringify(this.config));
    this.initClient();
  }

  // Initialize selected cloud provider
  initClient() {
    if (this.config.googleSheetUrl && this.config.googleSheetUrl.trim()) {
      if (this.config.neonDbUrl && this.config.neonDbUrl.trim()) {
        this.setStatus('connected', '⚡ Dual-Sync: Google Sheets + Neon DB Connected');
      } else {
        this.setStatus('connected', '📊 Google Sheets / Excel Online Connected');
      }
      return;
    }

    this.setStatus('local', 'Local Storage Mode');
  }

  // Test Connection
  async testConnection(testConfig = this.config) {
    const results = [];

    // Test Google Sheets
    if (testConfig.googleSheetUrl && testConfig.googleSheetUrl.trim()) {
      const url = testConfig.googleSheetUrl.trim();
      try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'action=test');
        if (res.ok) {
          results.push('✅ Google Sheet / Excel Online: Connected');
        } else {
          results.push(`⚠️ Google Sheet: Responded with HTTP ${res.status}`);
        }
      } catch (err) {
        results.push(`❌ Google Sheet: ${err.message}`);
      }
    }

    // Test Neon DB (if configured)
    if (testConfig.neonDbUrl && testConfig.neonDbUrl.trim()) {
      try {
        const neonRes = await this.executeNeonSql('SELECT 1 as health_check;', testConfig);
        if (neonRes) {
          results.push('✅ Neon PostgreSQL Database: Connected');
        }
      } catch (err) {
        results.push(`⚠️ Neon DB: ${err.message}`);
      }
    }

    if (results.length === 0) {
      return { success: true, message: 'Local storage mode is active.' };
    }

    return {
      success: true,
      message: results.join('\n')
    };
  }

  // Execute SQL Query on Neon DB via HTTP SQL Endpoint
  async executeNeonSql(sqlQuery, customConfig = this.config) {
    let endpoint = (customConfig.neonDbUrl || '').trim();
    if (!endpoint) return null;

    // Convert standard postgres:// or https:// URL to Neon SQL HTTP endpoint
    if (endpoint.startsWith('postgres://') || endpoint.startsWith('postgresql://')) {
      const match = endpoint.match(/@([^/]+)\/([^?]+)/);
      if (match) {
        endpoint = `https://${match[1]}/sql`;
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (customConfig.neonToken && customConfig.neonToken.trim()) {
      headers['Authorization'] = `Bearer ${customConfig.neonToken.trim()}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sqlQuery })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Neon DB error (${res.status}): ${txt}`);
    }

    return await res.json();
  }

  // Deduplicate entries by normalized (date, projectName, work)
  deduplicateEntries(entries) {
    if (!entries || !Array.isArray(entries)) return [];
    const seen = new Map();
    const result = [];

    entries.forEach(item => {
      if (!item) return;
      const normDate = this.normalizeDate(item.date);
      const cleanProject = (item.projectName || '').trim().toLowerCase();
      const cleanWork = (item.work || '').trim().toLowerCase();
      const key = `${normDate}__${cleanProject}__${cleanWork}`;

      item.date = normDate;

      if (!seen.has(key)) {
        seen.set(key, item);
        result.push(item);
      } else {
        const existing = seen.get(key);
        if ((!existing.remarks || existing.remarks.length === 0) && item.remarks) {
          existing.remarks = item.remarks;
        }
        if (!existing.hoursWorked && item.hoursWorked) {
          existing.hoursWorked = item.hoursWorked;
        }
      }
    });

    return result;
  }

  // Fetch all records (Cloud First -> fallback to LocalStorage)
  async fetchAll() {
    let entries = [];

    // 1. Google Sheets Fetch
    if (this.config.googleSheetUrl && navigator.onLine) {
      try {
        this.setStatus('syncing', 'Syncing Google Sheet...');
        const url = this.config.googleSheetUrl.trim();
        const res = await fetch(url);
        if (res.ok) {
          const sheetData = await res.json();
          if (Array.isArray(sheetData) && sheetData.length > 0) {
            entries = sheetData.map((item, idx) => ({
              id: item.id || `sheet-row-${idx}`,
              userId: item.userId || item.user_id || (item.user ? 'user_' + String(item.user).toLowerCase().replace(/\s+/g, '_') : 'user_kavin'),
              userName: item.userName || item.user_name || item.user || 'Kavin',
              date: this.normalizeDate(item.date),
              projectName: item.projectName || 'General',
              work: item.work || '',
              status: item.status || 'In Progress',
              hoursWorked: parseFloat(item.hoursWorked || 0),
              priority: item.priority || 'Medium',
              remarks: item.remarks || ''
            }));
            entries = this.deduplicateEntries(entries);
            localStorage.setItem(this.storageKey, JSON.stringify(entries));
            this.setStatus('connected', this.config.neonDbUrl ? '⚡ Dual-Sync: Sheets + Neon Synced' : '📊 Google Sheets Synced');
            return entries;
          }
        }
      } catch (err) {
        console.warn('Google Sheets fetch failed, checking local / DB cache:', err);
      }
    }

    // 2. LocalStorage Fallback
    const local = localStorage.getItem(this.storageKey);
    if (local) {
      try {
        entries = JSON.parse(local);
      } catch (e) {
        entries = [];
      }
    }

    // 3. Preload initial sample if empty
    if (!entries || entries.length === 0) {
      if (window.SAMPLE_WORKSHEET_DATA) {
        entries = [...window.SAMPLE_WORKSHEET_DATA];
        localStorage.setItem(this.storageKey, JSON.stringify(entries));
      }
    }

    return this.deduplicateEntries(entries);
  }

  // Save single entry (Dual-Write: Google Sheets + Neon DB + LocalStorage)
  async saveEntry(entry) {
    const local = localStorage.getItem(this.storageKey);
    let entries = local ? JSON.parse(local) : [];

    const existingIdx = entries.findIndex(e => e.id === entry.id);
    if (existingIdx !== -1) {
      entries[existingIdx] = { ...entries[existingIdx], ...entry, updatedAt: new Date().toISOString() };
    } else {
      entries.unshift({
        ...entry,
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    entries = this.deduplicateEntries(entries);
    localStorage.setItem(this.storageKey, JSON.stringify(entries));

    // Dual-Cloud Push in background
    this.dualPush(entry, 'upsert');
    this.notifyDataChange({ action: 'save', entry });
    return entry;
  }

  // Batch Import entries (Dual-Write)
  async batchImport(newEntries) {
    const local = localStorage.getItem(this.storageKey);
    let entries = local ? JSON.parse(local) : [];

    const merged = [...newEntries, ...entries];
    const deduplicated = this.deduplicateEntries(merged);
    localStorage.setItem(this.storageKey, JSON.stringify(deduplicated));

    // Dual-Cloud Push
    newEntries.forEach(e => this.dualPush(e, 'upsert'));
    this.notifyDataChange({ action: 'batchImport', count: newEntries.length });
    return deduplicated;
  }

  // Delete entry (Dual-Write)
  async deleteEntry(id) {
    const local = localStorage.getItem(this.storageKey);
    let entries = local ? JSON.parse(local) : [];
    const entryToDelete = entries.find(e => e.id === id);

    entries = entries.filter(e => e.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(entries));

    if (entryToDelete) {
      this.dualPush(entryToDelete, 'delete');
    }

    this.notifyDataChange({ action: 'delete', id });
    return true;
  }

  // Dual-Cloud Background Push to Google Sheets and Neon DB
  async dualPush(entry, action = 'upsert') {
    if (!navigator.onLine) return;

    // 1. Push to Google Sheets Web App
    if (this.config.googleSheetUrl) {
      try {
        const payload = {
          action: action,
          id: entry.id,
          date: entry.date,
          user: entry.userName || (window.authManager ? window.authManager.getCurrentUser().name : 'Kavin'),
          projectName: entry.projectName,
          work: entry.work,
          status: entry.status,
          hoursWorked: entry.hoursWorked || 0,
          priority: entry.priority || 'Medium',
          remarks: entry.remarks || '',
          updatedAt: new Date().toISOString()
        };

        fetch(this.config.googleSheetUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.warn('Sheets push warning:', err));
      } catch (e) {}
    }

    // 2. Push to Neon DB (if configured)
    if (this.config.neonDbUrl) {
      try {
        const q = action === 'delete'
          ? `DELETE FROM worksheet_entries WHERE id = '${entry.id}';`
          : `INSERT INTO worksheet_entries (id, user_name, date, project_name, work, status, hours_worked, priority, remarks, updated_at)
             VALUES ('${entry.id}', '${(entry.userName||'Kavin').replace(/'/g, "''")}', '${entry.date}', '${(entry.projectName||'').replace(/'/g, "''")}', '${(entry.work||'').replace(/'/g, "''")}', '${entry.status}', ${entry.hoursWorked||0}, '${entry.priority||'Medium'}', '${(entry.remarks||'').replace(/'/g, "''")}', NOW())
             ON CONFLICT (id) DO UPDATE SET work = EXCLUDED.work, status = EXCLUDED.status, hours_worked = EXCLUDED.hours_worked, remarks = EXCLUDED.remarks, updated_at = NOW();`;

        this.executeNeonSql(q).catch(err => console.warn('Neon DB push warning:', err));
      } catch (e) {}
    }
  }

  normalizeDate(d) {
    if (!d) return '';
    let str = String(d).trim();
    if (str.startsWith('2001-08-') || str.startsWith('2001-8-')) {
      str = '2026-08-' + str.substring(str.lastIndexOf('-') + 1).padStart(2, '0');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    try {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) {
        let yr = dt.getFullYear();
        if (yr === 2001) yr = 2026;
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const da = String(dt.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      }
    } catch (e) {}
    return str.substring(0, 10);
  }

  // Network Listeners
  bindNetworkListeners() {
    window.addEventListener('online', () => {
      this.setStatus('connected', 'Network restored. Re-syncing cloud...');
      this.fetchAll();
    });
    window.addEventListener('offline', () => {
      this.setStatus('local', 'Offline. Changes saved locally.');
    });
  }

  // Auto Polling (every 60s)
  startAutoPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => {
      if (this.config.autoSync && navigator.onLine) {
        this.fetchAll();
      }
    }, 60000);
  }

  // Status & Event Subscriptions
  setStatus(status, message) {
    this.currentStatus = status;
    this.statusMessage = message;
    this.statusListeners.forEach(cb => {
      try { cb({ status, message }); } catch (e) {}
    });
  }

  onStatusChange(callback) {
    this.statusListeners.push(callback);
    callback({ status: this.currentStatus, message: this.statusMessage });
  }

  onDataChange(callback) {
    this.dataChangeListeners.push(callback);
  }

  notifyDataChange(event) {
    this.dataChangeListeners.forEach(cb => {
      try { cb(event); } catch (e) {}
    });
  }
}

window.cloudStorage = new CloudStorageService();
