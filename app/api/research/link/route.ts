import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';

export const runtime = 'nodejs';

// Link a saved research row to a tracked account using service-role privileges.
// Body: { research_id: string, account_id?: string, company_name?: string }
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, supabase } = await authenticateRequest(authHeader);
    const body = await req.json();

    const researchId: string | undefined = body?.research_id;
    let accountId: string | undefined = body?.account_id;
    const companyName: string | undefined = body?.company_name;

    if (!researchId) {
      return Response.json({ error: 'Missing research_id' }, { status: 400 });
    }

    // If no account_id provided, try to resolve from company_name
    if (!accountId && companyName) {
      const { data: acct, error: acctErr } = await supabase
        .from('tracked_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_name', companyName)
        .maybeSingle();
      if (acctErr) throw acctErr;
      accountId = acct?.id;
    }

    if (!accountId) {
      return Response.json({ error: 'Unable to resolve account_id' }, { status: 400 });
    }

    // Ensure the research row belongs to this user before linking
    const { data: research, error: rErr } = await supabase
      .from('research_outputs')
      .select('id, user_id')
      .eq('id', researchId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!research || research.user_id !== user.id) {
      return Response.json({ error: 'Not found or not owned' }, { status: 404 });
    }

    const { error: updErr } = await supabase
      .from('research_outputs')
      .update({ account_id: accountId })
      .eq('id', researchId);
    if (updErr) throw updErr;

    return Response.json({ success: true, research_id: researchId, account_id: accountId });
  } catch (error: any) {
    console.error('[research/link] error:', error);
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}

