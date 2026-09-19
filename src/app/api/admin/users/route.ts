import { NextResponse } from 'next/server';
import { PRESET_USERS } from '@/modules/auth/auth.service';

export async function GET() {
  return NextResponse.json({ success: true, data: PRESET_USERS });
}
