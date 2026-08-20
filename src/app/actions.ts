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

export async function getWorksheetEntries(): Promise<WorksheetEntryDto[]> {
  const sessionResult = await validateSession();
  if (!sessionResult) return [];

  try {
    const entries = await prisma.worksheetEntry.findMany({
      where: { userId: sessionResult.user.id },
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
    // Verify ownership
    const existing = await prisma.worksheetEntry.findFirst({
      where: { id, userId: sessionResult.user.id },
    });
    if (!existing) throw new Error("Entry not found or unauthorized");

    const dataToUpdate: any = { ...updates };
    if (updates.date) {
      dataToUpdate.date = new Date(updates.date);
    }

    const updated = await prisma.worksheetEntry.update({
      where: { id },
      data: dataToUpdate,
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
    // Verify ownership
    const existing = await prisma.worksheetEntry.findFirst({
      where: { id, userId: sessionResult.user.id },
    });
    if (!existing) return false;

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
    // Verify ownership
    const source = await prisma.worksheetEntry.findFirst({
      where: { id, userId: sessionResult.user.id },
    });
    if (!source) return null;

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
        status: { in: ["In Progress", "Pending", "Blocked"] },
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
