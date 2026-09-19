import { NextResponse } from 'next/server';
import { prisma } from '@/shared/db/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    // Attempt Prisma fetch if database is reachable
    if (process.env.DATABASE_URL) {
      const whereClause = userEmail && userEmail !== 'ALL' ? { userEmail } : {};
      const entries = await prisma.workEntry.findMany({
        where: whereClause,
        orderBy: { workDate: 'desc' }
      });
      return NextResponse.json({ success: true, count: entries.length, data: entries });
    }
  } catch (err: any) {
    console.warn('Database offline or unconfigured, returning empty array fallback:', err.message);
  }

  return NextResponse.json({
    success: true,
    data: [],
    fallback: true,
    message: 'Local storage mode active.'
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (process.env.DATABASE_URL) {
      const newEntry = await prisma.workEntry.create({
        data: {
          userEmail: body.userEmail,
          userName: body.userName,
          workDate: body.workDate,
          projectName: body.projectName,
          taskDescription: body.taskDescription,
          hoursSpent: Number(body.hoursSpent),
          status: body.status || 'COMPLETED',
          priority: body.priority || 'MEDIUM',
          remarks: body.remarks || null,
          simulationCategory: body.simulationCategory || null,
          simulationWorkedNumber: body.simulationWorkedNumber ? Number(body.simulationWorkedNumber) : null,
          simulationTestedNumber: body.simulationTestedNumber ? Number(body.simulationTestedNumber) : null,
          isCarriedForward: Boolean(body.isCarriedForward)
        }
      });
      return NextResponse.json({ success: true, data: newEntry });
    }
    return NextResponse.json({ success: true, data: body, message: 'Saved to local buffer' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
