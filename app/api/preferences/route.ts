import { NextRequest } from 'next/server';
import { authenticateRequest } from '../lib/auth';
import { upsertPreferences, type PreferenceUpsert } from '../../../lib/preferences/store';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, supabase } = await authenticateRequest(authHeader);
    const body = await req.json().catch(() => ({}));

    // Accept either { key, value, source?, confidence? } or { preferences: [...] }
    let incoming: PreferenceUpsert[] = [];
    if (Array.isArray(body?.preferences)) {
      incoming = body.preferences as PreferenceUpsert[];
    } else if (typeof body?.key === 'string' && 'value' in body) {
      incoming = [{ key: body.key, value: body.value, source: body?.source, confidence: body?.confidence }];
    }

    if (!incoming.length) {
      return Response.json({ error: 'No preferences provided' }, { status: 400 });
    }

    const saved = await upsertPreferences(user.id, incoming, supabase);
    return Response.json({ success: true, savedKeys: saved });
  } catch (error: any) {
    console.error('[api/preferences] error:', error);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}

