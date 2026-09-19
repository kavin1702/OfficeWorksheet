import { SimulationMasterItem } from '@/shared/types';

export const MASTER_WORKED_SIMULATIONS: SimulationMasterItem[] = [
  {
    id: 'sim-w-1',
    number: 1,
    title: 'MDI â€“ Manufacturing / Manual Cleaning of Ethanol',
    category: 'WORKED',
    description: 'Ethanol manual cleaning procedures, vessel sterilization, and safety checks.',
    defaultHours: 6.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-2',
    number: 2,
    title: 'FFS â€“ Cleaning of Parisson Area',
    category: 'WORKED',
    description: 'Parisson extrusion station cleaning, vacuum sanitization, and optical inspection.',
    defaultHours: 6.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-3',
    number: 3,
    title: 'MDI â€“ Cleaning of Purified Water',
    category: 'WORKED',
    description: 'PW system line flush, sampling ports sanitization, and conductivity logging.',
    defaultHours: 6.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-4',
    number: 4,
    title: 'MDI â€“ Setup and Operations',
    category: 'WORKED',
    description: 'Metering valve assembly, propellant canister crimping, and aerosol test cycle.',
    defaultHours: 8.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-5',
    number: 5,
    title: 'Lupin Ophthalmic (including Jammed / Toppled Bottle)',
    category: 'WORKED',
    description: 'Aseptic ophthalmic filling line, conveyor jam clearance, bottle uprighting.',
    defaultHours: 8.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-6',
    number: 6,
    title: 'Lighting in Gowning',
    category: 'WORKED',
    description: 'Class A/B cleanroom gowning airlock lighting and lux measurement protocols.',
    defaultHours: 4.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-7',
    number: 7,
    title: 'Gowning & Entry to Secondary Packaging',
    category: 'WORKED',
    description: 'Secondary packaging gowning, PPE checklist, step-over bench protocol.',
    defaultHours: 5.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-8',
    number: 8,
    title: 'Cartoner â€“ Setup & Operation',
    category: 'WORKED',
    description: 'Continuous motion cartoner leaflet inserter, blister pack pusher calibration.',
    defaultHours: 7.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-9',
    number: 9,
    title: 'FFS â€“ Setup & Operation',
    category: 'WORKED',
    description: 'Form-Fill-Seal mold heating, resin extrusion, blow pin needle alignment.',
    defaultHours: 8.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-10',
    number: 10,
    title: 'Bundler â€“ Setup & Operation',
    category: 'WORKED',
    description: 'Shrink wrap sleeve heating tunnel, bundle collator, end-seal temperature tuning.',
    defaultHours: 6.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-11',
    number: 11,
    title: 'Material Airlock (MAL) / Personnel Airlock (PAL)',
    category: 'WORKED',
    description: 'Interlocking door logic, HEPA purge timer, surface disinfectant wipe-down.',
    defaultHours: 5.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-w-12',
    number: 12,
    title: 'Bio-Gowning & De-Gowning',
    category: 'WORKED',
    description: 'BSL-2/3 containment gowning, glove integrity testing, bio-waste disposal.',
    defaultHours: 6.0,
    status: 'ACTIVE'
  }
];

export const MASTER_TESTED_SIMULATIONS: SimulationMasterItem[] = [
  {
    id: 'sim-t-1',
    number: 1,
    title: 'Warehouse Operations',
    category: 'TESTED',
    description: 'Inventory racking, forklift safety bounding boxes, barcode scanning QA.',
    defaultHours: 4.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-t-2',
    number: 2,
    title: 'Dispensing of Raw Materials',
    category: 'TESTED',
    description: 'LAF hood tare weighing, API containment sampling, cross-contamination QA.',
    defaultHours: 5.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-t-3',
    number: 3,
    title: 'Granulation Line',
    category: 'TESTED',
    description: 'High shear mixer binder addition, fluid bed dryer moisture sensor test.',
    defaultHours: 6.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-t-4',
    number: 4,
    title: 'Compression Machine Operations',
    category: 'TESTED',
    description: 'Rotary tablet press punch tooling, hardness & friability testing QA.',
    defaultHours: 7.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-t-5',
    number: 5,
    title: 'Auto-Coater Process',
    category: 'TESTED',
    description: 'Perforated pan spray gun atomization, inlet air temp, exhaust balancing QA.',
    defaultHours: 5.0,
    status: 'ACTIVE'
  },
  {
    id: 'sim-t-6',
    number: 6,
    title: 'Blister Packaging Line',
    category: 'TESTED',
    description: 'Alu-Alu blister sealing temperature, optical camera pocket inspection QA.',
    defaultHours: 6.5,
    status: 'ACTIVE'
  },
  {
    id: 'sim-t-7',
    number: 7,
    title: 'Autoclave Sterilization Cycle',
    category: 'TESTED',
    description: 'Vacuum pulse steam penetration, biological indicator ampoule validation.',
    defaultHours: 4.5,
    status: 'ACTIVE'
  }
];
