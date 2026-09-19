'use client';

import React, { useRef } from 'react';
import { WorkEntry } from '@/shared/types';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { ExportService } from '../export.service';
import { WorksheetService, INITIAL_SAMPLE_ENTRIES } from '@/modules/worksheet/worksheet.service';
import { Download, Upload, FileSpreadsheet, RotateCcw, FileJson, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastProvider';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WorkEntry[];
  onDataImported: (entries: WorkEntry[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  onDataImported
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleExportExcel = () => {
    ExportService.exportToExcel(entries);
    addToast({
      title: 'Excel Export Complete',
      message: 'Downloaded multi-tab workbook with 12 Worked & 7 Tested simulation matrices!',
      type: 'success'
    });
  };

  const handleExportJson = () => {
    ExportService.exportToJson(entries);
    addToast({
      title: 'JSON Backup Created',
      message: 'Full workspace snapshot downloaded successfully.',
      type: 'success'
    });
  };

  const handleResetSampleData = () => {
    if (confirm('Reset workspace to initial sample dataset with all 22 historical entries?')) {
      WorksheetService.saveEntries(INITIAL_SAMPLE_ENTRIES);
      onDataImported(INITIAL_SAMPLE_ENTRIES);
      addToast({
        title: 'Sample Data Restored',
        message: 'Loaded default simulations and work logs.',
        type: 'info'
      });
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          WorksheetService.saveEntries(parsed);
          onDataImported(parsed);
          addToast({
            title: 'Import Successful',
            message: `Imported ${parsed.length} entries into workspace!`,
            type: 'success'
          });
          onClose();
        } else {
          throw new Error('Invalid array format');
        }
      } catch (err) {
        addToast({
          title: 'Import Failed',
          message: 'Invalid JSON file format. Please use a valid WorkPulse backup.',
          type: 'error'
        });
      }
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
            accept=".json"
            className="hidden"
          />

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Import JSON
            </Button>

            <Button
              variant="outline"
              onClick={handleResetSampleData}
              leftIcon={<RotateCcw className="w-4 h-4 text-amber-500" />}
            >
              Reset Samples
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
