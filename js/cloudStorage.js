/**
 * Cloud Storage & Multi-Device Sync Adapter (WorkPulse)
 * Supports:
 * 1. Google Sheets / Excel Online (Common shared spreadsheet across phone & PC)
 * 2. Instant Cloud Sync Key (Zero-setup free cloud sync across phone & laptop)
 * 3. Supabase PostgreSQL Cloud Database (Real-time enterprise cloud DB)
 * 4. Custom REST API Server
 * 5. Local Storage with Offline Fallback & Auto-Queue
 */

class CloudStorageService {
  constructor() {
    this.storageKey = 'workpulse_worksheet_entries';
    this.configKey = 'workpulse_cloud_config';
    this.syncQueueKey = 'workpulse_sync_queue';
    
    this.supabaseClient = null;
    this.statusListeners = [];
    this.dataChangeListeners = [];
    this.currentStatus = 'local'; // 'connected', 'syncing', 'local', 'error'
    this.statusMessage = 'Local Storage Mode';
    this.pollingInterval = null;
    this.realtimeChannel = null;

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
          provider: parsed.provider || 'local',
          googleSheetUrl: parsed.googleSheetUrl || '',
          syncKey: parsed.syncKey || '',
          supabaseUrl: parsed.supabaseUrl || '',
          supabaseAnonKey: parsed.supabaseAnonKey || '',
          restApiUrl: parsed.restApiUrl || '',
          restAuthToken: parsed.restAuthToken || '',
          autoSync: parsed.autoSync !== false
        };
      } catch (e) {
        console.error('Failed to parse cloud config:', e);
      }
    }
    return {
      provider: 'sheets', // 'sheets' | 'instant' | 'supabase' | 'rest' | 'local'
      googleSheetUrl: 'https://script.google.com/macros/s/AKfycbyTDZirH2EeXjQv1XKO2Jo9fdkJZ68-AJunzVb5-Fhr3etwmb2U7k_iOhE8aboB6dRCVw/exec',
      syncKey: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      restApiUrl: '',
      restAuthToken: '',
      autoSync: true
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
    // Clean up previous real-time channel
    if (this.realtimeChannel && this.supabaseClient) {
      try {
        this.supabaseClient.removeChannel(this.realtimeChannel);
      } catch (e) {}
      this.realtimeChannel = null;
    }

    if (this.config.provider === 'sheets' && this.config.googleSheetUrl && this.config.googleSheetUrl.trim()) {
      this.supabaseClient = null;
      this.setStatus('connected', '📊 Google Sheets / Excel Online Connected');
      return;
    }

    if (this.config.provider === 'instant' && this.config.syncKey && this.config.syncKey.trim()) {
      this.supabaseClient = null;
      this.setStatus('connected', 'Instant Cloud Synced (Key: ' + this.config.syncKey.trim() + ')');
      return;
    }

    if (this.config.provider === 'supabase' && this.config.supabaseUrl && this.config.supabaseAnonKey) {
      try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          this.supabaseClient = window.supabase.createClient(
            this.config.supabaseUrl.trim(),
            this.config.supabaseAnonKey.trim()
          );
          this.setStatus('connected', 'Supabase Cloud Connected');
          this.setupRealtimeSubscription();
          return;
        } else {
          this.setStatus('local', 'Supabase SDK Loading...');
        }
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        this.setStatus('error', 'Cloud Init Error');
      }
    } else if (this.config.provider === 'rest' && this.config.restApiUrl) {
      this.supabaseClient = null;
      this.setStatus('connected', 'REST Server Connected');
      return;
    }

    this.supabaseClient = null;
    this.setStatus('local', 'Local Storage Mode');
  }

  // Realtime subscription for Supabase
  setupRealtimeSubscription() {
    if (!this.supabaseClient) return;

    try {
      this.realtimeChannel = this.supabaseClient
        .channel('public:daily_worksheets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_worksheets' }, async (payload) => {
          console.log('Realtime change received from cloud:', payload);
          await this.fetchAll();
          this.notifyDataChange();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('WorkPulse Supabase Realtime Connected!');
          }
        });
    } catch (e) {
      console.warn('Realtime subscription skipped:', e);
    }
  }

  // Register listener for remote data changes
  onDataChange(callback) {
    this.dataChangeListeners.push(callback);
  }

  notifyDataChange() {
    this.dataChangeListeners.forEach(cb => {
      try { cb(); } catch (e) { console.error('Data change listener error:', e); }
    });
  }

  // Auto polling every 15s to keep phone & laptop in sync
  startAutoPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(async () => {
      if (!navigator.onLine) return;
      if (this.config.provider === 'sheets' || this.config.provider === 'instant' || this.config.provider === 'supabase' || this.config.provider === 'rest') {
        const prevDataStr = localStorage.getItem(this.storageKey);
        const latest = await this.fetchAll();
        const newDataStr = JSON.stringify(latest);
        if (prevDataStr !== newDataStr && latest && latest.length > 0) {
          this.notifyDataChange();
        }
      }
    }, 15000);
  }

  // Register listener for status updates
  onStatusChange(callback) {
    this.statusListeners.push(callback);
    callback(this.currentStatus, this.statusMessage);
  }

  setStatus(status, message) {
    this.currentStatus = status;
    this.statusMessage = message;
    this.statusListeners.forEach(cb => {
      try { cb(status, message); } catch (e) {}
    });
  }

  bindNetworkListeners() {
    window.addEventListener('online', () => {
      if (this.config.provider !== 'local') {
        this.setStatus('syncing', 'Syncing online...');
        this.syncPendingQueue();
      }
    });

    window.addEventListener('offline', () => {
      this.setStatus('local', 'Offline (Saved Locally)');
    });
  }

  // Test Cloud Connection
  async testConnection(testConfig = this.config) {
    if (testConfig.provider === 'sheets') {
      const url = (testConfig.googleSheetUrl || '').trim();
      if (!url) throw new Error('Please paste your Google Apps Script Web App URL.');
      try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'action=test');
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return { success: true, message: 'Successfully connected to Google Sheet / Excel Online!' };
      } catch (err) {
        throw new Error('Could not connect to Google Sheet Web App: ' + err.message);
      }
    } else if (testConfig.provider === 'instant') {
      const key = (testConfig.syncKey || '').trim();
      if (!key) {
        throw new Error('Please enter a Sync Key / Room Name (e.g. office-team-2026).');
      }
      return { success: true, message: `Instant Cloud Sync is active with key "${key}". Use this same key on your phone and laptop to share data!` };
    } else if (testConfig.provider === 'supabase') {
      const url = (testConfig.supabaseUrl || '').trim();
      const key = (testConfig.supabaseAnonKey || '').trim();

      if (!url || !key) {
        throw new Error('Please enter both Supabase Project URL and Anon API Key.');
      }
      if (!window.supabase) {
        throw new Error('Supabase library not loaded. Please verify internet connection.');
      }

      const client = window.supabase.createClient(url, key);
      const { data, error } = await client
        .from('daily_worksheets')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
          throw new Error('Table "daily_worksheets" does not exist yet. Please run the SQL setup query in Supabase SQL Editor.');
        }
        throw new Error(`Supabase Error (${error.code || 'ERR'}): ${error.message}`);
      }

      return { success: true, message: 'Successfully connected to Supabase Cloud Database!' };
    } else if (testConfig.provider === 'rest') {
      const url = (testConfig.restApiUrl || '').trim();
      if (!url) throw new Error('Please enter your REST API URL.');

      const headers = { 'Content-Type': 'application/json' };
      if (testConfig.restAuthToken) headers['Authorization'] = testConfig.restAuthToken.trim();

      const resp = await fetch(url, { method: 'GET', headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

      return { success: true, message: 'Successfully connected to REST Server!' };
    }

    return { success: true, message: 'Local storage mode is active.' };
  }

  // Fetch all records (Cloud First -> fallback to LocalStorage)
  async fetchAll() {
    let entries = [];

    // 1. Google Sheets / Excel Online Mode
    if (this.config.provider === 'sheets' && this.config.googleSheetUrl && navigator.onLine) {
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
            localStorage.setItem(this.storageKey, JSON.stringify(entries));
            this.setStatus('connected', '📊 Google Sheets Synced');
            return entries;
          }
        }
      } catch (err) {
        console.warn('Google Sheets fetch failed, using local cache:', err);
      }
    }

    // 2. Instant Cloud Sync Mode
    if (this.config.provider === 'instant' && this.config.syncKey && navigator.onLine) {
      try {
        const cloudData = await this.fetchInstantCloud(this.config.syncKey);
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          entries = cloudData;
          localStorage.setItem(this.storageKey, JSON.stringify(entries));
          this.setStatus('connected', 'Instant Cloud Synced');
          return entries;
        }
      } catch (err) {
        console.warn('Instant cloud fetch error, using local cache:', err);
      }
    }

    // 3. Supabase Cloud DB Mode
    if (this.config.provider === 'supabase' && this.supabaseClient && navigator.onLine) {
      try {
        this.setStatus('syncing', 'Syncing cloud...');
        const { data, error } = await this.supabaseClient
          .from('daily_worksheets')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          entries = data.map(item => this.mapFromSupabaseRow(item));
          localStorage.setItem(this.storageKey, JSON.stringify(entries));
          this.setStatus('connected', 'Supabase Cloud Synced');
          return entries;
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local cache:', err);
        this.setStatus('local', 'Offline Cache Mode');
      }
    }

    // 4. REST API Mode
    if (this.config.provider === 'rest' && this.config.restApiUrl && navigator.onLine) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.config.restAuthToken) headers['Authorization'] = this.config.restAuthToken.trim();

        const res = await fetch(this.config.restApiUrl, { headers });
        if (res.ok) {
          entries = await res.json();
          localStorage.setItem(this.storageKey, JSON.stringify(entries));
          this.setStatus('connected', 'REST Cloud Synced');
          return entries;
        }
      } catch (err) {
        console.warn('REST fetch failed:', err);
      }
    }

    // 5. LocalStorage Fallback
    const local = localStorage.getItem(this.storageKey);
    if (local) {
      try {
        entries = JSON.parse(local);
      } catch (e) {
        entries = [];
      }
    }

    // If completely new and empty, preload sample office data
    if (!entries || entries.length === 0) {
      if (window.SAMPLE_WORKSHEET_DATA) {
        entries = [...window.SAMPLE_WORKSHEET_DATA];
        localStorage.setItem(this.storageKey, JSON.stringify(entries));
      }
    }

    return entries;
  }

  // Save single entry (Create or Update)
  async saveEntry(entry) {
    // 1. Save to local storage cache immediately for zero latency
    let localEntries = this.getLocalEntries();
    const idx = localEntries.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      localEntries[idx] = entry;
    } else {
      localEntries.unshift(entry);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(localEntries));

    // 2. Sync to Google Sheets
    if (this.config.provider === 'sheets' && this.config.googleSheetUrl && navigator.onLine) {
      try {
        this.setStatus('syncing', 'Saving to Google Sheet...');
        await fetch(this.config.googleSheetUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'upsert', entry: entry })
        });
        this.setStatus('connected', '📊 Google Sheets Synced');
      } catch (err) {
        console.error('Google Sheet save error:', err);
      }
    }

    // 3. Sync to Instant Cloud
    if (this.config.provider === 'instant' && this.config.syncKey && navigator.onLine) {
      try {
        this.setStatus('syncing', 'Saving to Cloud...');
        await this.pushInstantCloud(this.config.syncKey, localEntries);
        this.setStatus('connected', 'Instant Cloud Synced');
      } catch (err) {
        console.error('Instant cloud save failed:', err);
      }
    }

    // 4. Sync to Supabase
    if (this.config.provider === 'supabase' && this.supabaseClient && navigator.onLine) {
      try {
        this.setStatus('syncing', 'Saving to Supabase...');
        const row = this.mapToSupabaseRow(entry);
        const { error } = await this.supabaseClient
          .from('daily_worksheets')
          .upsert(row, { onConflict: 'id' });

        if (error) throw error;
        this.setStatus('connected', 'Supabase Cloud Synced');
      } catch (err) {
        console.error('Supabase sync error:', err);
        this.enqueueSync('upsert', entry);
        this.setStatus('local', 'Offline (Pending Cloud Sync)');
      }
    }

    // 5. Sync to REST
    if (this.config.provider === 'rest' && this.config.restApiUrl && navigator.onLine) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.config.restAuthToken) headers['Authorization'] = this.config.restAuthToken.trim();

        await fetch(`${this.config.restApiUrl}/${entry.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(entry)
        });
      } catch (err) {
        this.enqueueSync('upsert', entry);
      }
    }

    return entry;
  }

  // Delete entry
  async deleteEntry(id) {
    let localEntries = this.getLocalEntries().filter(e => e.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(localEntries));

    if (this.config.provider === 'sheets' && this.config.googleSheetUrl && navigator.onLine) {
      try {
        await fetch(this.config.googleSheetUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: id })
        });
      } catch (e) {}
    }

    if (this.config.provider === 'instant' && this.config.syncKey && navigator.onLine) {
      try {
        await this.pushInstantCloud(this.config.syncKey, localEntries);
      } catch (e) {}
    }

    if (this.config.provider === 'supabase' && this.supabaseClient && navigator.onLine) {
      try {
        const { error } = await this.supabaseClient
          .from('daily_worksheets')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        this.enqueueSync('delete', { id });
      }
    }

    return true;
  }

  // Batch Import / Upload all entries
  async batchImport(entries) {
    let localEntries = this.getLocalEntries();
    
    entries.forEach(newEntry => {
      const idx = localEntries.findIndex(e => e.id === newEntry.id);
      if (idx >= 0) {
        localEntries[idx] = newEntry;
      } else {
        localEntries.push(newEntry);
      }
    });

    localStorage.setItem(this.storageKey, JSON.stringify(localEntries));

    // Upload all to Google Sheet
    if (this.config.provider === 'sheets' && this.config.googleSheetUrl && navigator.onLine) {
      try {
        this.setStatus('syncing', 'Syncing with Google Sheet...');
        await fetch(this.config.googleSheetUrl.trim(), {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync_all', entries: localEntries })
        });
        this.setStatus('connected', '📊 Google Sheets Synced');
      } catch (e) {
        console.error('Google Sheet batch sync failed:', e);
      }
    }

    if (this.config.provider === 'instant' && this.config.syncKey && navigator.onLine) {
      try {
        await this.pushInstantCloud(this.config.syncKey, localEntries);
      } catch (e) {}
    }

    if (this.config.provider === 'supabase' && this.supabaseClient && navigator.onLine) {
      try {
        const rows = entries.map(e => this.mapToSupabaseRow(e));
        await this.supabaseClient
          .from('daily_worksheets')
          .upsert(rows, { onConflict: 'id' });
      } catch (err) {
        console.error('Supabase batch upload failed:', err);
      }
    }

    return localEntries;
  }

  // Helper: Get local entries
  getLocalEntries() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Queue unsynced actions
  enqueueSync(action, payload) {
    try {
      const queue = JSON.parse(localStorage.getItem(this.syncQueueKey) || '[]');
      queue.push({ action, payload, timestamp: Date.now() });
      localStorage.setItem(this.syncQueueKey, JSON.stringify(queue));
    } catch (e) {}
  }

  async syncPendingQueue() {
    try {
      const queue = JSON.parse(localStorage.getItem(this.syncQueueKey) || '[]');
      if (queue.length === 0) return;

      for (const item of queue) {
        if (item.action === 'upsert') {
          await this.saveEntry(item.payload);
        } else if (item.action === 'delete') {
          await this.deleteEntry(item.payload.id);
        }
      }

      localStorage.removeItem(this.syncQueueKey);
      this.setStatus('connected', 'Cloud Synced');
    } catch (err) {
      console.error('Failed to flush sync queue:', err);
    }
  }

  // -------------------------------------------------------------
  // Instant Cloud Storage Adapter (Uses Global Key-Value Sync)
  // -------------------------------------------------------------
  async fetchInstantCloud(key) {
    const cleanKey = encodeURIComponent(key.trim().toLowerCase());
    const storageUrl = `https://kvdb.io/4y9n8p3d5K6h2u/${cleanKey}`;
    try {
      const res = await fetch(storageUrl);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) return json;
      }
    } catch (e) {
      console.warn('Instant cloud fetch error:', e);
    }
    return null;
  }

  async pushInstantCloud(key, data) {
    const cleanKey = encodeURIComponent(key.trim().toLowerCase());
    const storageUrl = `https://kvdb.io/4y9n8p3d5K6h2u/${cleanKey}`;
    try {
      await fetch(storageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn('Instant cloud push error:', e);
    }
  }

  // Schema Mapping
  mapToSupabaseRow(entry) {
    return {
      id: entry.id,
      user_id: entry.userId || 'user_kavin',
      user_name: entry.userName || 'Kavin',
      date: entry.date,
      project_name: entry.projectName,
      work: entry.work,
      status: entry.status || 'In Progress',
      hours_worked: entry.hoursWorked || 0,
      priority: entry.priority || 'Medium',
      remarks: entry.remarks || '',
      created_at: entry.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  mapFromSupabaseRow(row) {
    return {
      id: row.id,
      userId: row.user_id || row.userId || 'user_kavin',
      userName: row.user_name || row.userName || 'Kavin',
      date: this.normalizeDate(row.date),
      projectName: row.project_name || row.projectName || 'General',
      work: row.work || '',
      status: row.status || 'In Progress',
      hoursWorked: parseFloat(row.hours_worked || row.hoursWorked || 0),
      priority: row.priority || 'Medium',
      remarks: row.remarks || '',
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }

  normalizeDate(d) {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
    try {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) {
        const yr = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const da = String(dt.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      }
    } catch (e) {}
    return String(d).substring(0, 10);
  }
}

window.cloudStorage = new CloudStorageService();
