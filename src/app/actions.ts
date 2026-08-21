"use server";

import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Type definitions
export interface WorksheetEntryDto {
  id: string;
  date: string; // YYYY-MM-DD
  projectName: string;
  work: string;
  status: string;
  hoursWorked: number;
  priority: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userName: string;
  userColor: string;
  userRole?: string;
}

// Mapper
function mapToDto(entry: any): WorksheetEntryDto {
  return {
    id: entry.id,
    date: entry.date instanceof Date ? entry.date.toISOString().split("T")[0] : String(entry.date),
    projectName: entry.projectName,
    work: entry.work,
    status: entry.status,
    hoursWorked: Number(entry.hoursWorked),
    priority: entry.priority,
    remarks: entry.remarks || "",
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : String(entry.createdAt),
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : String(entry.updatedAt),
    userId: entry.userId,
    userName: entry.user?.name || "User",
    userColor: entry.user?.color || "#3b82f6",
    userRole: entry.user?.role || "Team Member",
  };
}

export async function dbHealthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

export async function getWorksheetEntries(scope: 'me' | 'all' = 'me'): Promise<WorksheetEntryDto[]> {
  const sessionResult = await validateSession();
  if (!sessionResult) return [];

  try {
    const whereClause = scope === 'all' ? {} : { userId: sessionResult.user.id };

    const entries = await prisma.worksheetEntry.findMany({
      where: whereClause,
      include: {
        user: true
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ]
    });
    return entries.map(mapToDto);
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return [];
  }
}

export async function createWorksheetEntry(data: {
  date: string;
  projectName: string;
  work: string;
  status: string;
  hoursWorked: number;
  priority: string;
  remarks?: string;
}): Promise<WorksheetEntryDto | null> {
  const sessionResult = await validateSession();
  if (!sessionResult) throw new Error("Unauthorized");

  try {
    const created = await prisma.worksheetEntry.create({
      data: {
        userId: sessionResult.user.id,
        date: new Date(data.date),
        projectName: data.projectName,
        work: data.work,
        status: data.status,
        hoursWorked: data.hoursWorked,
        priority: data.priority,
        remarks: data.remarks || "",
      },
      include: {
        user: true
      }
    });
    revalidatePath("/");
    return mapToDto(created);
  } catch (error) {
    console.error("Failed to create entry:", error);
    return null;
  }
}

export async function updateWorksheetEntry(
  id: string,
  updates: {
    date?: string;
    projectName?: string;
    work?: string;
    status?: string;
    hoursWorked?: number;
    priority?: string;
    remarks?: string;
  }
): Promise<WorksheetEntryDto | null> {
  const sessionResult = await validateSession();
  if (!sessionResult) throw new Error("Unauthorized");

  try {
    // If scope is 'all', admin or any user can edit (matching local collaborative sheet style, or enforcing ownership if needed)
    // To allow full team collaboration like the static user switcher app, we allow editing any log or restrict it. 
    // The static app allows any profile switcher to edit logs, so we allow it but log the update, or we can enforce ownership. Let's enforce ownership for security, or check: 
    // In kavin's static app, switching users lets them edit the workspace. So let's allow editing if the user owns it or if we are in shared mode. Let's allow editing owned entries.
    const existing = await prisma.worksheetEntry.findFirst({
      where: { id },
    });
    if (!existing) throw new Error("Entry not found");

    // Enforce that user can only edit their own logs
    if (existing.userId !== sessionResult.user.id) {
      throw new Error("Unauthorized to edit this entry");
    }

    const dataToUpdate: any = { ...updates };
    if (updates.date) {
      dataToUpdate.date = new Date(updates.date);
    }

    const updated = await prisma.worksheetEntry.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: true
      }
    });
    revalidatePath("/");
    return mapToDto(updated);
  } catch (error) {
    console.error("Failed to update entry:", error);
    return null;
  }
}

export async function deleteWorksheetEntry(id: string): Promise<boolean> {
  const sessionResult = await validateSession();
  if (!sessionResult) throw new Error("Unauthorized");

  try {
    const existing = await prisma.worksheetEntry.findFirst({
      where: { id },
    });
    if (!existing) return false;

    // Enforce ownership
    if (existing.userId !== sessionResult.user.id) {
      throw new Error("Unauthorized to delete this entry");
    }

    await prisma.worksheetEntry.delete({
      where: { id },
    });
    revalidatePath("/");
    return true;
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return false;
  }
}

export async function duplicateWorksheetEntry(id: string): Promise<WorksheetEntryDto | null> {
  const sessionResult = await validateSession();
  if (!sessionResult) throw new Error("Unauthorized");

  try {
    const source = await prisma.worksheetEntry.findFirst({
      where: { id },
    });
    if (!source) return null;

    // Duplicate creates a log for the currently active user (today)
    const cloned = await prisma.worksheetEntry.create({
      data: {
        userId: sessionResult.user.id,
        date: new Date(), // Today
        projectName: source.projectName,
        work: source.work,
        status: "In Progress",
        hoursWorked: source.hoursWorked,
        priority: source.priority,
        remarks: source.remarks ? `Continuation: ${source.remarks}` : "Continuation",
      },
      include: {
        user: true
      }
    });
    revalidatePath("/");
    return mapToDto(cloned);
  } catch (error) {
    console.error("Failed to duplicate entry:", error);
    return null;
  }
}

export async function carryForwardYesterdayPending(): Promise<{ count: number; message: string }> {
  const sessionResult = await validateSession();
  if (!sessionResult) throw new Error("Unauthorized");
  const userId = sessionResult.user.id;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find unfinished tasks from yesterday for this user
    const unfinishedYesterday = await prisma.worksheetEntry.findMany({
      where: {
        userId,
        date: yesterday,
        status: { in: ["In Progress", "Pending", "Blocked", "Under Review"] },
      },
    });

    if (unfinishedYesterday.length === 0) {
      return { count: 0, message: "No unfinished tasks found from yesterday." };
    }

    // Find already existing tasks today to avoid duplicates
    const todayTasks = await prisma.worksheetEntry.findMany({
      where: { userId, date: today },
    });

    let addedCount = 0;
    for (const task of unfinishedYesterday) {
      const alreadyExists = todayTasks.some(
        (t) => t.projectName === task.projectName && t.work === task.work
      );

      if (!alreadyExists) {
        await prisma.worksheetEntry.create({
          data: {
            userId,
            date: today,
            projectName: task.projectName,
            work: task.work,
            status: task.status,
            hoursWorked: 0, // Reset hours for today
            priority: task.priority,
            remarks: "Carried forward from yesterday",
          },
        });
        addedCount++;
      }
    }

    revalidatePath("/");
    return {
      count: addedCount,
      message: addedCount > 0
        ? `Successfully carried forward ${addedCount} unfinished task(s) to today's worksheet!`
        : `All yesterday's unfinished tasks are already in today's worksheet.`,
    };
  } catch (error) {
    console.error("Failed to carry forward tasks:", error);
    return { count: 0, message: "Error carrying forward pending tasks." };
  }
}

export async function bulkImportEntries(
  entries: Array<{
    date: string;
    projectName: string;
    work: string;
    status: string;
    hoursWorked: number;
    priority: string;
    remarks?: string;
  }>
): Promise<boolean> {
  const sessionResult = await validateSession();
  if (!sessionResult) throw new Error("Unauthorized");
  const userId = sessionResult.user.id;

  try {
    const dataToCreate = entries.map((entry) => ({
      userId,
      date: new Date(entry.date),
      projectName: entry.projectName || "General",
      work: entry.work || "",
      status: entry.status || "In Progress",
      hoursWorked: entry.hoursWorked || 0,
      priority: entry.priority || "Medium",
      remarks: entry.remarks || "",
    }));

    await prisma.worksheetEntry.createMany({
      data: dataToCreate,
    });

    revalidatePath("/");
    return true;
  } catch (error) {
    console.error("Failed to bulk import entries:", error);
    return false;
  }
}
