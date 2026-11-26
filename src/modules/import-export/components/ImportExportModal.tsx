'use client';

import React, { useRef, useState } from 'react';
import { WorkEntry } from '@/shared/types';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { ExportService } from '../export.service';
import { INITIAL_SAMPLE_ENTRIES } from '@/modules/worksheet/worksheet.service';
import { parseImportedEntry } from '@/shared/validation';
import { Upload, FileSpreadsheet, RotateCcw, FileJson } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastProvider';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WorkEntry[];
  storageMode: 'sheets' | 'local' | null;
  onImport: (
    entries: WorkEntry[],
    mode: 'append' | 'replace'
  ) => Promise<{ added: number; updated: number; total: number }>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  storageMode,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const importModeRef = useRef<'append' | 'replace'>('append');
  const { addToast } = useToast();
  const target = storageMode === 'sheets' ? 'Google Sheets' : 'this browser';

  const handleExportExcel = () => {
    try {
      ExportService.exportToExcel(entries);
      addToast({ title: 'Excel exported', message: 'Workbook with logs and both simulation matrices downloaded.', type: 'success' });
    } catch (e) {
      addToast({ title: 'Export failed', message: (e as Error).message, type: 'error' });
    }
  };

  const handleExportJson = () => {
    ExportService.exportToJson(entries);
    addToast({ title: 'JSON backup created', message: `${entries.length} entries downloaded.`, type: 'success' });
  };

  const runImport = async (list: WorkEntry[], mode: 'append' | 'replace', label: string) => {
    setBusy(true);
    try {
      const result = await onImport(list, mode);
      addToast({
        title: `${label} complete`,
        message: `${result.added} added, ${result.updated} updated in ${target}. Total: ${result.total}.`,
        type: 'success'
      });
      onClose();
    } catch (e) {
      addToast({ title: `${label} failed`, message: (e as Error).message, type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleResetSampleData = () => {
    if (confirm('Replace everything in this browser with the sample data?')) {
      runImport(INITIAL_SAMPLE_ENTRIES, 'replace', 'Reset');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be chosen again later
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let list: WorkEntry[];
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        if (!Array.isArray(parsed)) throw new Error('The file must contain a JSON array of entries.');
        const defaults = { userName: 'Imported', userEmail: 'imported@workpulse.local' };
        list = parsed.map((raw, i) => {
          try {
            return parseImportedEntry(raw, defaults);
          } catch (err) {
            throw new Error(`Entry ${i + 1}: ${(err as Error).message}`);
          }
        });
      } catch (err) {
        addToast({ title: 'Import failed', message: (err as Error).message, type: 'error' });
        return;
      }
      const mode = importModeRef.current;
      if (
        mode === 'replace' &&
        !confirm(`This DELETES all ${entries.length} current entries in ${target} and keeps only the ${list.length} from the file. Continue?`)
      ) {
        return;
      }
      runImport(list, mode, 'Import');
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import, Export & Data Management" size="md">
      <div className="space-y-4">
        {/* Export options */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            Export Workspace Data
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportExcel}
              className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 text-left transition-all group"
            >
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">Export to Excel (.xlsx)</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Includes Multi-Tab Matrix</div>
            </button>

            <button
              onClick={handleExportJson}
              className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/40 text-left transition-all group"
            >
              <FileJson className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">JSON Full Backup</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Raw JSON snapshot</div>
            </button>
          </div>
        </div>

        {/* Import & Reset */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Import & Restore
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                importModeRef.current = 'append';
                fileInputRef.current?.click();
              }}
              leftIcon={<Upload className="w-4 h-4" />}
              title="Adds the file's entries; entries with the same id are updated"
            >
              {busy ? 'Importing…' : 'Import JSON (add)'}
            </Button>

            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                importModeRef.current = 'replace';
                fileInputRef.current?.click();
              }}
              leftIcon={<Upload className="w-4 h-4 text-rose-500" />}
              title="Deletes everything and keeps only the file's entries"
            >
              Import &amp; replace all
            </Button>

            {storageMode !== 'sheets' && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={handleResetSampleData}
                leftIcon={<RotateCcw className="w-4 h-4 text-amber-500" />}
              >
                Reset Samples
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
