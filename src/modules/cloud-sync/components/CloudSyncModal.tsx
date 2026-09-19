'use client';

import React, { useState } from 'react';
import { WorkEntry, CloudSyncConfig } from '@/shared/types';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { GoogleSheetsService } from '../googleSheets.service';
import { Cloud, RefreshCw, CheckCircle2, Link2, ExternalLink } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastProvider';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WorkEntry[];
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, entries }) => {
  const [config, setConfig] = useState<CloudSyncConfig>(GoogleSheetsService.getConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const { addToast } = useToast();

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    GoogleSheetsService.saveConfig(config);
    addToast({
      title: 'Settings Saved',
      message: 'Cloud Sync configuration has been updated.',
      type: 'success'
    });
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await GoogleSheetsService.syncEntries(entries);
      if (res.success) {
        addToast({ title: 'Sync Completed', message: res.message, type: 'success' });
        setConfig(GoogleSheetsService.getConfig());
      } else {
        addToast({ title: 'Sync Warning', message: res.message, type: 'error' });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google Sheets Cloud Synchronization" size="md">
      <form onSubmit={handleSaveConfig} className="space-y-4">
        <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5 mb-1">
            <Cloud className="w-4 h-4" /> Live Google Sheets Bridge
          </p>
          Connect a Google Apps Script Web App URL to automatically stream work logs and simulation matrices to your central Google Drive spreadsheet.
        </div>

        <Input
          label="Google Apps Script Web App URL"
          type="url"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={config.scriptUrl || ''}
          onChange={(e) => setConfig({ ...config, scriptUrl: e.target.value })}
          leftIcon={<Link2 className="w-4 h-4 text-slate-400" />}
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoSyncToggle"
            checked={config.autoSync}
            onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-slate-300"
          />
          <label htmlFor="autoSyncToggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Enable background auto-sync when entries are modified
          </label>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>

          <Button type="submit" variant="primary">
            Save Configuration
          </Button>
        </div>
      </form>
    </Modal>
  );
};
