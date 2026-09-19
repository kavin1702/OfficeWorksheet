import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scriptUrl, entries } = body;

    if (!scriptUrl) {
      return NextResponse.json({ success: false, error: 'Google Apps Script URL is required.' }, { status: 400 });
    }

    // Server-side forward to Google Apps Script
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SYNC_ALL', entries })
    });

    const resData = await response.text();
    return NextResponse.json({ success: true, message: 'Dispatched to Google Sheets successfully.', result: resData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
