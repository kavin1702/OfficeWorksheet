'use client';

import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { WorksheetService } from '@/modules/worksheet/worksheet.service';
import { EntriesApi } from '@/modules/worksheet/entries.api';
import type { SessionInfo } from '@/modules/auth/useSession';
import { useToast } from '@/shared/components/ui/ToastProvider';
import { Cloud, CheckCircle2, RefreshCw, UploadCloud, ExternalLink, AlertTriangle } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionInfo | null;
  onUploaded: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, session, onUploaded }) => {
  const { addToast } = useToast();
  const [testing, setTesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ rows: number; spreadsheetUrl: string | null } | null>(null);
  const connected = session?.storage === 'sheets';

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/sheets/status', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus({ rows: data.rows, spreadsheetUrl: data.spreadsheetUrl });
      addToast({ title: 'Connected', message: `Google Sheet has ${data.rows} rows.`, type: 'success' });
    } catch (e) {
      addToast({ title: 'Connection failed', message: (e as Error).message, type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const uploadLocal = async () => {
    const local = typeof window !== 'undefined' ? localStorage.getItem('workpulse_work_entries') : null;
    const list = local ? WorksheetService.getAllEntries() : [];
    if (!list.length) {
      addToast({ title: 'Nothing to upload', message: 'This browser has no saved work logs.', type: 'info' });
      return;
    }
    if (!confirm(`Upload ${list.length} work logs from this browser to Google Sheets? Entries already in the sheet (same id) are updated, not duplicated.`)) return;
    setUploading(true);
    try {
      const result = await EntriesApi.importAll(list, 'append');
      addToast({
        title: 'Upload complete',
        message: `${result.added} added, ${result.updated} updated. Sheet now has ${result.total} rows.`,
        type: 'success'
      });
      onUploaded();
    } catch (e) {
      addToast({ title: 'Upload failed', message: (e as Error).message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google Sheets storage" size="md">
      <div className="space-y-4 text-sm">
        {connected ? (
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 flex gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">Connected</p>
              <p className="text-xs mt-0.5">
                Every add, edit and delete is written straight to your Google Sheet through the server. Nothing to sync by hand.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 flex gap-2">
            {session?.storage === 'misconfigured' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Cloud className="w-5 h-5 shrink-0" />}
            <div>
              <p className="font-bold">{session?.storage === 'misconfigured' ? 'Setup problem' : 'Not connected yet'}</p>
              <p className="text-xs mt-0.5">
                {session?.storageProblem || 'Right now your logs are saved only in this browser.'}
              </p>
            </div>
          </div>
        )}

        {connected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing}
                leftIcon={<RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />}
              >
                {testing ? 'Testing…' : 'Test connection'}
              </Button>
              <Button variant="primary" onClick={uploadLocal} disabled={uploading} leftIcon={<UploadCloud className="w-4 h-4" />}>
                {uploading ? 'Uploading…' : 'Upload this browser’s old data'}
              </Button>
            </div>
            {status && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sheet rows: <strong>{status.rows}</strong>
                {status.spreadsheetUrl && (
                  <>
                    {' · '}
                    <a href={status.spreadsheetUrl} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                      Open the Google Sheet <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-slate-900 dark:text-white">How to connect (free, about 5 minutes)</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>Create a Google Sheet, then open <strong>Extensions → Apps Script</strong>.</li>
              <li>
                Paste the code from <code>apps-script/Code.gs</code> in the project and save.
              </li>
              <li>
                In <strong>Project Settings → Script Properties</strong>, add <code>API_SECRET</code> with a long random value.
              </li>
              <li>
                <strong>Deploy → New deployment → Web app</strong>. Execute as <em>Me</em>, access <em>Anyone</em>. Copy the <code>/exec</code> URL.
              </li>
              <li>
                In Vercel (or <code>.env.local</code>) set <code>GOOGLE_SCRIPT_URL</code>, <code>GOOGLE_SCRIPT_SECRET</code> (same value as API_SECRET),
                <code> APP_PASSWORD</code> and <code>SESSION_SECRET</code>, then redeploy.
              </li>
            </ol>
            <p className="text-xs text-slate-500">Full guide: docs/GOOGLE_SHEETS_SETUP.md in the repository.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
