'use client';
import { useCallback, useEffect, useState } from 'react';
import { WorkEntry, WorkEntryInput } from '@/shared/types';
import { WorksheetService } from './worksheet.service';
import { EntriesApi } from './entries.api';
import type { StorageMode } from '@/modules/auth/useSession';

/**
 * One place that owns the list of work entries.
 * - mode "sheets": every change goes to the server, which writes to Google Sheets.
 * - mode "local":  changes stay in this browser (localStorage).
 * Every mutation returns a Promise so the UI can wait, show errors, and only
 * close a form once the save really worked.
 */
export function useWorkEntries(mode: StorageMode | null) {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isSheets = mode === 'sheets';

  const reload = useCallback(async () => {
    if (mode === null) return;
    setIsLoading(true);
    try {
      const list = isSheets ? await EntriesApi.list() : WorksheetService.getAllEntries();
      setEntries(WorksheetService.sortEntries(list));
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [mode, isSheets]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addEntry = useCallback(
    async (input: WorkEntryInput) => {
      const saved = isSheets ? await EntriesApi.create(input) : WorksheetService.addEntry(input);
      setEntries((prev) => WorksheetService.sortEntries([saved, ...prev]));
      return saved;
    },
    [isSheets]
  );

  const updateEntry = useCallback(
    async (id: string, input: WorkEntryInput) => {
      const saved = isSheets ? await EntriesApi.update(id, input) : WorksheetService.updateEntry(id, input);
      if (!saved) throw new Error('Entry not found. It may have been deleted.');
      setEntries((prev) => WorksheetService.sortEntries(prev.map((e) => (e.id === id ? saved : e))));
      return saved;
    },
    [isSheets]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (isSheets) await EntriesApi.remove(id);
      else WorksheetService.deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [isSheets]
  );

  const importEntries = useCallback(
    async (list: WorkEntry[], importMode: 'append' | 'replace') => {
      if (isSheets) {
        const result = await EntriesApi.importAll(list, importMode);
        await reload();
        return result;
      }
      const current = importMode === 'replace' ? [] : WorksheetService.getAllEntries();
      const byId = new Map(current.map((e) => [e.id, e]));
      let updated = 0;
      list.forEach((e) => {
        if (byId.has(e.id)) updated++;
        byId.set(e.id, e);
      });
      const merged = Array.from(byId.values());
      WorksheetService.saveEntries(merged);
      setEntries(WorksheetService.sortEntries(merged));
      return { added: list.length - updated, updated, total: merged.length };
    },
    [isSheets, reload]
  );

  return { entries, isLoading, loadError, reload, addEntry, updateEntry, deleteEntry, importEntries };
}
