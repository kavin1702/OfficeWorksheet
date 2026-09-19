import { SimulationMasterItem, SimulationMatrixItem, WorkEntry } from '@/shared/types';
import { MASTER_WORKED_SIMULATIONS, MASTER_TESTED_SIMULATIONS } from './simulation.constants';

export class SimulationService {
  static getMasterWorkedList(): SimulationMasterItem[] {
    return MASTER_WORKED_SIMULATIONS;
  }

  static getMasterTestedList(): SimulationMasterItem[] {
    return MASTER_TESTED_SIMULATIONS;
  }

  static calculateMatrix(entries: WorkEntry[]): {
    workedMatrix: SimulationMatrixItem[];
    testedMatrix: SimulationMatrixItem[];
    totalWorkedHours: number;
    totalTestedHours: number;
    workedCompletionRate: number;
    testedCompletionRate: number;
  } {
    const workedMap = new Map<number, SimulationMatrixItem>();
    const testedMap = new Map<number, SimulationMatrixItem>();

    MASTER_WORKED_SIMULATIONS.forEach(sim => {
      workedMap.set(sim.number, {
        number: sim.number,
        title: sim.title,
        category: 'WORKED',
        totalHours: 0,
        entriesCount: 0,
        lastWorkedDate: null,
        statusCount: { COMPLETED: 0, IN_PROGRESS: 0, ON_HOLD: 0, BLOCKED: 0 },
        isCompleted: false,
        entries: []
      });
    });

    MASTER_TESTED_SIMULATIONS.forEach(sim => {
      testedMap.set(sim.number, {
        number: sim.number,
        title: sim.title,
        category: 'TESTED',
        totalHours: 0,
        entriesCount: 0,
        lastWorkedDate: null,
        statusCount: { COMPLETED: 0, IN_PROGRESS: 0, ON_HOLD: 0, BLOCKED: 0 },
        isCompleted: false,
        entries: []
      });
    });

    // Populate from actual entries
    entries.forEach(entry => {
      const entryText = `${entry.projectName} ${entry.taskDescription} ${entry.remarks || ''}`.toLowerCase();

      // Check worked simulations
      MASTER_WORKED_SIMULATIONS.forEach(sim => {
        const titleWords = sim.title.toLowerCase().split(/[\sâ€“â€”\(\)\/]+/).filter(w => w.length > 3);
        const isMatch =
          entry.simulationWorkedNumber === sim.number ||
          titleWords.some(w => entryText.includes(w)) ||
          (entry.projectName.toLowerCase().includes('mdi') && sim.title.toLowerCase().includes('mdi')) ||
          (entry.projectName.toLowerCase().includes('ffs') && sim.title.toLowerCase().includes('ffs')) ||
          (entry.projectName.toLowerCase().includes('lupin') && sim.title.toLowerCase().includes('lupin')) ||
          (entry.projectName.toLowerCase().includes('gowning') && sim.title.toLowerCase().includes('gowning')) ||
          (entry.projectName.toLowerCase().includes('cartoner') && sim.title.toLowerCase().includes('cartoner')) ||
          (entry.projectName.toLowerCase().includes('bundler') && sim.title.toLowerCase().includes('bundler'));

        if (isMatch && (entry.simulationCategory === 'WORKED' || !entry.simulationCategory)) {
          const item = workedMap.get(sim.number)!;
          item.totalHours += entry.hoursSpent;
          item.entriesCount += 1;
          item.statusCount[entry.status] = (item.statusCount[entry.status] || 0) + 1;
          if (!item.lastWorkedDate || entry.workDate > item.lastWorkedDate) {
            item.lastWorkedDate = entry.workDate;
          }
          if (entry.status === 'COMPLETED') item.isCompleted = true;
          item.entries.push(entry);
        }
      });

      // Check tested simulations
      MASTER_TESTED_SIMULATIONS.forEach(sim => {
        const titleWords = sim.title.toLowerCase().split(/[\sâ€“â€”\(\)\/]+/).filter(w => w.length > 3);
        const isMatch =
          entry.simulationTestedNumber === sim.number ||
          (entry.simulationCategory === 'TESTED' && titleWords.some(w => entryText.includes(w))) ||
          (entry.taskDescription.toLowerCase().includes('test') && titleWords.some(w => entryText.includes(w)));

        if (isMatch) {
          const item = testedMap.get(sim.number)!;
          item.totalHours += entry.hoursSpent;
          item.entriesCount += 1;
          item.statusCount[entry.status] = (item.statusCount[entry.status] || 0) + 1;
          if (!item.lastWorkedDate || entry.workDate > item.lastWorkedDate) {
            item.lastWorkedDate = entry.workDate;
          }
          if (entry.status === 'COMPLETED') item.isCompleted = true;
          item.entries.push(entry);
        }
      });
    });

    const workedMatrix = Array.from(workedMap.values());
    const testedMatrix = Array.from(testedMap.values());

    const totalWorkedHours = workedMatrix.reduce((acc, curr) => acc + curr.totalHours, 0);
    const totalTestedHours = testedMatrix.reduce((acc, curr) => acc + curr.totalHours, 0);

    const workedCompleted = workedMatrix.filter(m => m.entriesCount > 0 && m.statusCount.COMPLETED > 0).length;
    const testedCompleted = testedMatrix.filter(m => m.entriesCount > 0 && m.statusCount.COMPLETED > 0).length;

    const workedCompletionRate = Math.round((workedCompleted / MASTER_WORKED_SIMULATIONS.length) * 100);
    const testedCompletionRate = Math.round((testedCompleted / MASTER_TESTED_SIMULATIONS.length) * 100);

    return {
      workedMatrix,
      testedMatrix,
      totalWorkedHours: parseFloat(totalWorkedHours.toFixed(1)),
      totalTestedHours: parseFloat(totalTestedHours.toFixed(1)),
      workedCompletionRate,
      testedCompletionRate
    };
  }
}
