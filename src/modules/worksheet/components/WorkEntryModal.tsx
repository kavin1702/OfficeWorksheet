'use client';

import React, { useState, useEffect } from 'react';
import { WorkEntry, WorkStatus, WorkPriority, User } from '@/shared/types';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { getTodayString } from '@/shared/utils/date';
import { MASTER_WORKED_SIMULATIONS, MASTER_TESTED_SIMULATIONS } from '@/modules/simulations/simulation.constants';
import { Save, Calendar, Clock, Sparkles, Layers, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import { useToast } from '@/shared/components/ui/ToastProvider';

interface WorkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entryData: Omit<WorkEntry, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => void;
  editingEntry?: WorkEntry | null;
  currentUser: User;
  initialSimulationTitle?: string;
  initialCategory?: 'WORKED' | 'TESTED';
  initialSimNumber?: number;
}

export const WorkEntryModal: React.FC<WorkEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEntry,
  currentUser,
  initialSimulationTitle,
  initialCategory,
  initialSimNumber
}) => {
  const { addToast } = useToast();

  const [workDate, setWorkDate] = useState(getTodayString());
  const [projectName, setProjectName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [hoursSpent, setHoursSpent] = useState<number>(6.0);
  const [status, setStatus] = useState<WorkStatus>('COMPLETED');
  const [priority, setPriority] = useState<WorkPriority>('MEDIUM');
  const [remarks, setRemarks] = useState('');
  const [simulationCategory, setSimulationCategory] = useState<'WORKED' | 'TESTED' | 'GENERAL'>('WORKED');
  const [simulationWorkedNumber, setSimulationWorkedNumber] = useState<number | undefined>(undefined);
  const [simulationTestedNumber, setSimulationTestedNumber] = useState<number | undefined>(undefined);
  const [isCarriedForward, setIsCarriedForward] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setWorkDate(editingEntry.workDate);
      setProjectName(editingEntry.projectName);
      setTaskDescription(editingEntry.taskDescription);
      setHoursSpent(editingEntry.hoursSpent);
      setStatus(editingEntry.status);
      setPriority(editingEntry.priority);
      setRemarks(editingEntry.remarks || '');
      setSimulationCategory(editingEntry.simulationCategory || 'WORKED');
      setSimulationWorkedNumber(editingEntry.simulationWorkedNumber);
      setSimulationTestedNumber(editingEntry.simulationTestedNumber);
      setIsCarriedForward(editingEntry.isCarriedForward || false);
    } else {
      setWorkDate(getTodayString());
      setProjectName(initialSimulationTitle || MASTER_WORKED_SIMULATIONS[0].title);
      setTaskDescription('');
      setHoursSpent(6.0);
      setStatus('COMPLETED');
      setPriority('MEDIUM');
      setRemarks('');
      setSimulationCategory(initialCategory || 'WORKED');
      setSimulationWorkedNumber(initialCategory === 'WORKED' ? initialSimNumber || 1 : undefined);
      setSimulationTestedNumber(initialCategory === 'TESTED' ? initialSimNumber || 1 : undefined);
      setIsCarriedForward(false);
    }
  }, [editingEntry, isOpen, initialSimulationTitle, initialCategory, initialSimNumber]);

  const handleWorkedSelect = (number: number) => {
    const sim = MASTER_WORKED_SIMULATIONS.find(s => s.number === number);
    if (sim) {
      setProjectName(sim.title);
      setSimulationCategory('WORKED');
      setSimulationWorkedNumber(sim.number);
      setSimulationTestedNumber(undefined);
      if (!editingEntry) setHoursSpent(sim.defaultHours || 6.0);
    }
  };

  const handleTestedSelect = (number: number) => {
    const sim = MASTER_TESTED_SIMULATIONS.find(s => s.number === number);
    if (sim) {
      setProjectName(sim.title);
      setSimulationCategory('TESTED');
      setSimulationTestedNumber(sim.number);
      setSimulationWorkedNumber(undefined);
      if (!editingEntry) setHoursSpent(sim.defaultHours || 4.5);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      addToast({ title: 'Validation Error', message: 'Project or Simulation name is required.', type: 'error' });
      return;
    }
    if (!taskDescription.trim()) {
      addToast({ title: 'Validation Error', message: 'Task description cannot be empty.', type: 'error' });
      return;
    }
    if (hoursSpent <= 0 || isNaN(hoursSpent)) {
      addToast({ title: 'Validation Error', message: 'Please enter valid hours spent (e.g. 6.5).', type: 'error' });
      return;
    }

    onSave(
      {
        userEmail: currentUser.email,
        userName: currentUser.name,
        workDate,
        projectName: projectName.trim(),
        taskDescription: taskDescription.trim(),
        hoursSpent: Number(hoursSpent),
        status,
        priority,
        remarks: remarks.trim() || undefined,
        simulationCategory,
        simulationWorkedNumber,
        simulationTestedNumber,
        isCarriedForward
      },
      editingEntry ? editingEntry.id : undefined
    );

    addToast({
      title: editingEntry ? 'Work Log Updated' : 'Work Log Saved',
      message: `${projectName} (${hoursSpent} hrs) has been recorded!`,
      type: 'success'
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEntry ? 'Edit Work Entry' : 'Create Daily Work Log'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Preset quick pickers */}
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            Master Simulation Fast Select
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mb-1">
                12 Worked Simulations:
              </span>
              <select
                className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                onChange={(e) => handleWorkedSelect(Number(e.target.value))}
                value={simulationWorkedNumber || ''}
              >
                <option value="">-- Choose Worked Simulation --</option>
                {MASTER_WORKED_SIMULATIONS.map((s) => (
                  <option key={s.id} value={s.number}>
                    #{s.number}: {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                7 Tested Simulations:
              </span>
              <select
                className="w-full text-xs h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                onChange={(e) => handleTestedSelect(Number(e.target.value))}
                value={simulationTestedNumber || ''}
              >
                <option value="">-- Choose Tested Simulation --</option>
                {MASTER_TESTED_SIMULATIONS.map((s) => (
                  <option key={s.id} value={s.number}>
                    #{s.number}: {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date and Project Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Work Date"
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            required
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
          />

          <div className="md:col-span-2">
            <Input
              label="Project / Simulation Name"
              type="text"
              placeholder="e.g. MDI â€“ Cleaning of Purified Water"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              leftIcon={<Layers className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </div>

        {/* Task Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Tasks Completed / Work Description *
          </label>
          <textarea
            rows={3}
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Detailed description of simulation scripts built, VR physics adjusted, bugs fixed, or test cycles performed..."
            required
            className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        {/* Hours Spent, Status, Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Hours Spent"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={hoursSpent}
            onChange={(e) => setHoursSpent(parseFloat(e.target.value))}
            required
            leftIcon={<Clock className="w-4 h-4 text-slate-400" />}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Work Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkStatus)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as WorkPriority)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="URGENT">ðŸ”´ Urgent</option>
              <option value="HIGH">ðŸŸ  High</option>
              <option value="MEDIUM">ðŸ”µ Medium</option>
              <option value="LOW">âšª Low</option>
            </select>
          </div>
        </div>

        {/* Remarks and Carry Forward */}
        <div className="space-y-3">
          <Input
            label="Remarks / Notes (Optional)"
            type="text"
            placeholder="e.g. Physics collision mesh updated, pending QA approval on Tuesday"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            leftIcon={<MessageSquare className="w-4 h-4 text-slate-400" />}
          />

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="carryForwardCheck"
              checked={isCarriedForward}
              onChange={(e) => setIsCarriedForward(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500"
            />
            <label htmlFor="carryForwardCheck" className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              Mark as <b>Carried Forward</b> from a previous day
            </label>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
            {editingEntry ? 'Save Changes' : 'Save Work Log'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
