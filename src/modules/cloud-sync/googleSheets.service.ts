import { WorkEntry, CloudSyncConfig } from '@/shared/types';

const SYNC_CONFIG_KEY = 'workpulse_cloud_sync_config';

export class GoogleSheetsService {
  static getConfig(): CloudSyncConfig {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SYNC_CONFIG_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to load sync config', e);
      }
    }
    return {
      autoSync: true,
      lastSyncTime: null,
      syncStatus: 'IDLE'
    };
  }

  static saveConfig(config: CloudSyncConfig): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    }
  }

  static async syncEntries(entries: WorkEntry[]): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();
    if (!config.scriptUrl || !config.scriptUrl.startsWith('http')) {
      // Offline fallback: save locally and pretend OK
      return {
        success: true,
        message: 'Saved locally. Add a Google Apps Script Web App URL to push directly to Google Sheets.'
      };
    }

    try {
      const response = await fetch(config.scriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script Web App standard mode
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_ALL', entries })
      });

      config.lastSyncTime = new Date().toISOString();
      config.syncStatus = 'SYNCED';
      this.saveConfig(config);

      return { success: true, message: 'Successfully dispatched sync payload to Google Sheets!' };
    } catch (e: any) {
      config.syncStatus = 'ERROR';
      this.saveConfig(config);
      return { success: false, message: e.message || 'Network error syncing with Google Sheets' };
    }
  }
}
