import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'dev'
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
