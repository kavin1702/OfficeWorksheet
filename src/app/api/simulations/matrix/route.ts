import { NextResponse } from 'next/server';
import { SimulationService } from '@/modules/simulations/simulation.service';
import { INITIAL_SAMPLE_ENTRIES } from '@/modules/worksheet/worksheet.service';

export async function GET() {
  try {
    const matrix = SimulationService.calculateMatrix(INITIAL_SAMPLE_ENTRIES);
    return NextResponse.json({ success: true, data: matrix });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
