'use client';

import React, { useState } from 'react';
import { WorkEntry, User } from '@/shared/types';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { ReportService } from '../report.service';
import { getTodayString } from '@/shared/utils/date';
import { Copy, Check, FileText, Send } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastProvider';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: WorkEntry[];
  currentUser: User;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  isOpen,
  onClose,
  entries,
  currentUser
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const reportContent = ReportService.generateDailyMarkdown(selectedDate, entries, currentUser.name);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportContent);
    setCopied(true);
    addToast({
      title: 'Report Copied',
      message: 'Markdown status update copied to clipboard for Slack / WhatsApp / Email!',
      type: 'success'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Daily Standup / EOD Report" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Report Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Report Preview (WhatsApp / Slack Ready)
          </label>
          <textarea
            readOnly
            rows={10}
            value={reportContent}
            className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none select-all"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="primary"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            className="w-full"
          >
            {copied ? 'Copied to Clipboard!' : 'Copy Formatted Report'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
