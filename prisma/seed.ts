import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString) {
    console.error("Please set DATABASE_URL environment variable.");
    process.exit(1);
  }

  console.log("Seeding database...");
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // 1. Create default seed user
  const email = "seed@workpulse.app";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert user
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Seed Employee"
      }
    });
    console.log(`Created default user account:`);
    console.log(`- Email: ${email}`);
    console.log(`- Password: ${password}`);
  } else {
    console.log(`User ${email} already exists.`);
  }

  // 2. Clear existing entries for seed user to avoid duplicates
  await prisma.worksheetEntry.deleteMany({
    where: { userId: user.id }
  });

  const SAMPLE_DATA = [
    {
      userId: user.id,
      date: new Date("2026-08-03"),
      projectName: "MDI_Manu_CleaningEthanol",
      work: "• Updated Grab Pose\n• Implemented audio changes",
      status: "Completed",
      hoursWorked: 8.0,
      priority: "High",
      remarks: "Simulation package tested and audio synced."
    },
    {
      userId: user.id,
      date: new Date("2026-08-04"),
      projectName: "MDI_Manu_CleaningEthanol",
      work: "• Tested 4 simulations in MDI environment",
      status: "Completed",
      hoursWorked: 8.0,
      priority: "High",
      remarks: "All 4 simulations verified without errors."
    },
    {
      userId: user.id,
      date: new Date("2026-08-05"),
      projectName: "Cleaning-of-Parisson-Area",
      work: "Storyboard explanation and process walkthrough with team",
      status: "Pending",
      hoursWorked: 4.0,
      priority: "Medium",
      remarks: "Parisson flow alignment."
    },
    {
      userId: user.id,
      date: new Date("2026-08-05"),
      projectName: "MDI_Manu_CleaningEthanol",
      work: "Updated the simulation package and asset references",
      status: "Pending",
      hoursWorked: 4.0,
      priority: "Medium",
      remarks: "Awaiting final review."
    },
    {
      userId: user.id,
      date: new Date("2026-08-06"),
      projectName: "MDI_Parisson Area Cleaning",
      work: "Step Wizard — worked on 10 sequential simulation steps",
      status: "In Progress",
      hoursWorked: 3.5,
      priority: "High",
      remarks: "Step wizard foundation ready."
    },
    {
      userId: user.id,
      date: new Date("2026-08-06"),
      projectName: "MDI_Cleaning of Ethanol",
      work: "Grab Pose correction and hand interaction refinement",
      status: "In Progress",
      hoursWorked: 2.5,
      priority: "Medium",
      remarks: "Adjusted controller offsets."
    },
    {
      userId: user.id,
      date: new Date("2026-08-06"),
      projectName: "MDI_Cleaning of Purified Water",
      work: "Fixed Audio triggers, Detect Visual markers and Grab Pose",
      status: "In Progress",
      hoursWorked: 2.0,
      priority: "Medium",
      remarks: "Audio cue alignment completed."
    },
    {
      userId: user.id,
      date: new Date("2026-08-07"),
      projectName: "MDI_Manu_Ethanol",
      work: "Updating VIVE package and VR SDK dependencies",
      status: "In Progress",
      hoursWorked: 3.0,
      priority: "High",
      remarks: "VIVE SDK upgrade in progress."
    },
    {
      userId: user.id,
      date: new Date("2026-08-07"),
      projectName: "MDI_Setup and Ops",
      work: "Updating VIVE package configuration and build settings",
      status: "In Progress",
      hoursWorked: 2.5,
      priority: "Medium",
      remarks: "Testing headset tracking."
    },
    {
      userId: user.id,
      date: new Date("2026-08-07"),
      projectName: "FFS - Cleaning of Parisson Area",
      work: "Step Wizard setup and flow integration",
      status: "In Progress",
      hoursWorked: 2.5,
      priority: "Medium",
      remarks: "Initial step sequence mapped."
    },
    {
      userId: user.id,
      date: new Date("2026-08-08"),
      projectName: "Leave / Weekend",
      work: "🏖️ Weekend / Off",
      status: "Leave",
      hoursWorked: 0,
      priority: "Low",
      remarks: "Weekend"
    },
    {
      userId: user.id,
      date: new Date("2026-08-09"),
      projectName: "Leave / Weekend",
      work: "🏖️ Weekend / Off",
      status: "Leave",
      hoursWorked: 0,
      priority: "Low",
      remarks: "Weekend"
    },
    {
      userId: user.id,
      date: new Date("2026-08-10"),
      projectName: "FFS_Cleaning Of Parisson Area",
      work: "• Completed the Step Wizard for all steps\n• Fixed Detect Visual functionality for all steps",
      status: "Completed",
      hoursWorked: 8.0,
      priority: "High",
      remarks: "All step wizards verified and working."
    },
    {
      userId: user.id,
      date: new Date("2026-08-11"),
      projectName: "FFS - Cleaning of Parisson Area",
      work: "• Worked on the Step Events\n• Configured and updated event behavior for the simulation steps",
      status: "In Progress",
      hoursWorked: 8.0,
      priority: "High",
      remarks: "Event triggers connected to state machine."
    },
    {
      userId: user.id,
      date: new Date("2026-08-12"),
      projectName: "MDI_Manu_Ethanol",
      work: "• Correction work on simulation models\n• Testing on the VR platform",
      status: "In Progress",
      hoursWorked: 8.0,
      priority: "High",
      remarks: "Performance testing on target hardware."
    },
    {
      userId: user.id,
      date: new Date("2026-08-13"),
      projectName: "Leave / Off",
      work: "🏖️ Official Leave",
      status: "Leave",
      hoursWorked: 0,
      priority: "Low",
      remarks: "Approved Leave"
    },
    {
      userId: user.id,
      date: new Date("2026-08-14"),
      projectName: "Leave / Off",
      work: "🏖️ Official Leave",
      status: "Leave",
      hoursWorked: 0,
      priority: "Low",
      remarks: "Approved Leave"
    }
  ];

  for (const item of SAMPLE_DATA) {
    await prisma.worksheetEntry.create({
      data: item
    });
  }

  console.log("Seeding finished. Successfully seeded mock logs mapped to default user.");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
