import { NextResponse } from 'next/server';

// Phase 4 Quota Shield: cache this route segment at the edge for 1 hour so
// repeat visits never hit Firestore for global/static data.
export const revalidate = 3600;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json({ message: "API is running securely" }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}
