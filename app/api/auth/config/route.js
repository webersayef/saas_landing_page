import { NextResponse } from 'next/server';

// Public auth config for the login/register UI — currently just whether
// Google sign-in is configured (button is shown only when it is).
export async function GET() {
  return NextResponse.json({ google: !!process.env.GOOGLE_CLIENT_ID });
}
