import { PrismaClient, Role, WorkType, TaskStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

const SIMULATIONS_WORKED_ON = [
  "MDI - Manufacturing / Manual Cleaning of Ethanol",
  "FFS - Cleaning of Parisson Area",
  "MDI - Cleaning of Purified Water",
  "MDI - Setup and Operations",
  "Lupin Ophthalmic (including Jammed / Toppled Bottle)",
  "Lighting in Gowning",
  "Operation of Filling Machine - FFS",
  "Cleaning Nozzle Shroud - FFS",
  "Jammed / Toppled Nozzles",
  "SVP2 Intervention",
  "Ophtha 3 Assembly",
  "Ophtha 3 Intervention"
];

const SIMULATIONS_TESTED = [
  "MDI - Cleaning of Purified Water",
  "MDI - Cleaning of Ethanol",
  "MDI - Line Clearance",
  "MDI - Setup and Operation",
  "MDI - Partial Cleaning",
  "FFS - Cleaning of Nozzle Shrouds",
  "FFS - Cleaning of Parisson Area"
];

const INITIAL_WORKSHEET_DATA = [
  {
    date: "2026-08-03",
    projectName: "MDI - Manufacturing / Manual Cleaning of Ethanol",
    workType: WorkType.WORKED,
    work: "- Updated Grab Pose in VR\n- Implemented audio trigger changes",
    status: TaskStatus.COMPLETED,
    hoursWorked: 8.0,
    priority: Priority.HIGH,
    remarks: "Simulation package tested and audio synced."
  },
  {
    date: "2026-08-04",
    projectName: "MDI - Cleaning of Ethanol",
    workType: WorkType.TESTED,
    work: "- Tested 4 simulations in MDI environment\n- Verified controller interaction limits",
    status: TaskStatus.COMPLETED,
    hoursWorked: 8.0,
    priority: Priority.HIGH,
    remarks: "All 4 simulations verified without errors."
  },
  {
    date: "2026-08-05",
    projectName: "FFS - Cleaning of Parisson Area",
    workType: WorkType.WORKED,
    work: "Storyboard explanation and process walkthrough with team",
    status: TaskStatus.COMPLETED,
    hoursWorked: 4.0,
    priority: Priority.MEDIUM,
    remarks: "Parisson flow alignment approved."
  },
  {
    date: "2026-08-05",
    projectName: "MDI - Manufacturing / Manual Cleaning of Ethanol",
    workType: WorkType.WORKED,
    work: "Updated the simulation package and asset references",
    status: TaskStatus.COMPLETED,
    hoursWorked: 4.0,
    priority: Priority.MEDIUM,
    remarks: "Asset shaders and LODs updated."
  },
  {
    date: "2026-08-06",
    projectName: "FFS - Cleaning of Parisson Area",
    workType: WorkType.WORKED,
    work: "Step Wizard - worked on 10 sequential simulation steps",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 3.5,
    priority: Priority.HIGH,
    remarks: "Step wizard foundation ready."
  },
  {
    date: "2026-08-06",
    projectName: "MDI - Cleaning of Purified Water",
    workType: WorkType.WORKED,
    work: "Grab Pose correction and hand interaction refinement",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 2.5,
    priority: Priority.MEDIUM,
    remarks: "Adjusted controller offsets."
  },
  {
    date: "2026-08-06",
    projectName: "MDI - Cleaning of Purified Water",
    workType: WorkType.TESTED,
    work: "Fixed Audio triggers, Detect Visual markers and tested Grab Pose in headset",
    status: TaskStatus.COMPLETED,
    hoursWorked: 2.0,
    priority: Priority.MEDIUM,
    remarks: "Audio cues and visual targets aligned."
  },
  {
    date: "2026-08-07",
    projectName: "MDI - Setup and Operations",
    workType: WorkType.WORKED,
    work: "Updating VIVE package and VR SDK dependencies",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 3.0,
    priority: Priority.HIGH,
    remarks: "Upgraded OpenXR and runtime bindings."
  },
  {
    date: "2026-08-07",
    projectName: "MDI - Setup and Operation",
    workType: WorkType.TESTED,
    work: "Testing headset tracking and operator ergonomics in virtual cleanroom",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 2.5,
    priority: Priority.MEDIUM,
    remarks: "Headset telemetry logged."
  },
  {
    date: "2026-08-07",
    projectName: "FFS - Cleaning of Parisson Area",
    workType: WorkType.TESTED,
    work: "Testing step wizard sequence and error highlighting",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 2.5,
    priority: Priority.MEDIUM,
    remarks: "Step progression verified."
  },
  {
    date: "2026-08-08",
    projectName: "MDI - Line Clearance",
    workType: WorkType.TESTED,
    work: "Step Wizard testing for sequential line clearance verification",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 4.0,
    priority: Priority.HIGH,
    remarks: "Steps 1 through 8 completed."
  },
  {
    date: "2026-08-08",
    projectName: "MDI - Partial Cleaning",
    workType: WorkType.TESTED,
    work: "Verification testing for partial cleaning protocols",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 4.0,
    priority: Priority.MEDIUM,
    remarks: "Test pass completed."
  },
  {
    date: "2026-08-10",
    projectName: "FFS - Cleaning of Parisson Area",
    workType: WorkType.WORKED,
    work: "- Completed the Step Wizard for all steps\n- Fixed Detect Visual functionality for all steps",
    status: TaskStatus.COMPLETED,
    hoursWorked: 8.0,
    priority: Priority.HIGH,
    remarks: "All step wizards verified and working."
  },
  {
    date: "2026-08-11",
    projectName: "FFS - Cleaning of Nozzle Shrouds",
    workType: WorkType.TESTED,
    work: "Tested Nozzle Shroud disinfection steps and tool snap interactions",
    status: TaskStatus.COMPLETED,
    hoursWorked: 4.0,
    priority: Priority.MEDIUM,
    remarks: "Nozzle shroud clean test passed."
  },
  {
    date: "2026-08-11",
    projectName: "Cleaning Nozzle Shroud - FFS",
    workType: WorkType.WORKED,
    work: "Model updates and asset reference corrections across scene nodes",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 4.0,
    priority: Priority.MEDIUM,
    remarks: "Cleaned redundant mesh colliders."
  },
  {
    date: "2026-08-12",
    projectName: "Lupin Ophthalmic (including Jammed / Toppled Bottle)",
    workType: WorkType.WORKED,
    work: "Physics simulation setup for bottle toppling and conveyor belt jams",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 5.0,
    priority: Priority.HIGH,
    remarks: "Rigid body colliders tuned."
  },
  {
    date: "2026-08-12",
    projectName: "Lighting in Gowning",
    workType: WorkType.WORKED,
    work: "Light fixture shader configuration and lux level adjustments",
    status: TaskStatus.COMPLETED,
    hoursWorked: 3.0,
    priority: Priority.MEDIUM,
    remarks: "Cleanroom lighting calibrated."
  },
  {
    date: "2026-08-13",
    projectName: "Operation of Filling Machine - FFS",
    workType: WorkType.WORKED,
    work: "Rotary dial and HMI control panel scripting",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 4.0,
    priority: Priority.HIGH,
    remarks: "HMI animation curves mapped."
  },
  {
    date: "2026-08-14",
    projectName: "Jammed / Toppled Nozzles",
    workType: WorkType.WORKED,
    work: "Nozzle jam detection and operator intervention scenario scripting",
    status: TaskStatus.COMPLETED,
    hoursWorked: 4.0,
    priority: Priority.HIGH,
    remarks: "Intervention scenario logic verified."
  },
  {
    date: "2026-08-17",
    projectName: "SVP2 Intervention",
    workType: WorkType.WORKED,
    work: "SVP2 glove port insertion animations and sterile boundary collision triggers",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 5.0,
    priority: Priority.HIGH,
    remarks: "Glove port physics active."
  },
  {
    date: "2026-08-18",
    projectName: "Ophtha 3 Assembly",
    workType: WorkType.WORKED,
    work: "Component assembly hierarchy setup and magnetic snap anchors",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 5.0,
    priority: Priority.HIGH,
    remarks: "Snap anchors connected."
  },
  {
    date: "2026-08-19",
    projectName: "Ophtha 3 Intervention",
    workType: WorkType.WORKED,
    work: "Emergency stop protocol and maintenance checklist walkthrough",
    status: TaskStatus.IN_PROGRESS,
    hoursWorked: 4.0,
    priority: Priority.MEDIUM,
    remarks: "E-stop sequence tested."
  }
];

async function main() {
  console.log('Seeding Neon database with WorkPulse master catalogs and accounts...');

  // 1. Seed Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'mnkavin2006@gmail.com' },
    update: { role: Role.ADMIN },
    create: {
      email: 'mnkavin2006@gmail.com',
      name: 'Kavin M (Admin)',
      username: 'mnkavin',
      passwordHash: 'password123',
      role: Role.ADMIN,
      color: '#f59e0b',
      avatar: 'K'
    }
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'kavin@8chili.com' },
    update: { role: Role.TEAM_MEMBER },
    create: {
      email: 'kavin@8chili.com',
      name: 'Kavin (8chili)',
      username: 'kavin8chili',
      passwordHash: 'password123',
      role: Role.TEAM_MEMBER,
      color: '#3b82f6',
      avatar: 'K'
    }
  });

  console.log(`Users seeded: Admin (${adminUser.email}), Member (${memberUser.email})`);

  // 2. Seed Master Catalogs
  let order = 1;
  for (const name of SIMULATIONS_WORKED_ON) {
    await prisma.simulationCatalog.upsert({
      where: { name },
      update: { displayOrder: order, category: WorkType.WORKED },
      create: { name, category: WorkType.WORKED, displayOrder: order++ }
    });
  }

  order = 1;
  for (const name of SIMULATIONS_TESTED) {
    await prisma.simulationCatalog.upsert({
      where: { name },
      update: { displayOrder: order, category: WorkType.TESTED },
      create: { name, category: WorkType.TESTED, displayOrder: order++ }
    });
  }

  console.log('Simulation Catalogs seeded: 12 Worked On + 7 Tested.');

  // 3. Seed Initial Work Entries for Kavin
  for (const item of INITIAL_WORKSHEET_DATA) {
    await prisma.workEntry.create({
      data: {
        userId: memberUser.id,
        userName: memberUser.name,
        date: item.date,
        projectName: item.projectName,
        workType: item.workType,
        work: item.work,
        status: item.status,
        hoursWorked: item.hoursWorked,
        priority: item.priority,
        remarks: item.remarks
      }
    });
  }

  console.log(`Seeded ${INITIAL_WORKSHEET_DATA.length} initial work log entries for ${memberUser.name}.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });