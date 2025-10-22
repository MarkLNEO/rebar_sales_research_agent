import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, supabase } = await authenticateRequest(authHeader);
    const body = await req.json();

    const { action, companies } = body;

    if (action === 'add' && Array.isArray(companies)) {
      const records = companies.map(c => ({
        user_id: user.id,
        company_name: c.company_name || c.name,
        domain: c.domain || null,
        priority: c.priority || 'standard',
        metadata: c.metadata || {}
      }));

      const { data, error } = await supabase
        .from('tracked_accounts')
        .upsert(records, { onConflict: 'user_id,company_name' })
        .select();

      if (error) throw error;

      return Response.json({
        success: true,
        added: data?.length || 0,
        accounts: data
      });
    }

    if (action === 'remove' && Array.isArray(companies)) {
      const names = companies.map(c => c.company_name || c.name);
      const { error } = await supabase
        .from('tracked_accounts')
        .delete()
        .eq('user_id', user.id)
        .in('company_name', names);

      if (error) throw error;

      return Response.json({
        success: true,
        removed: names.length
      });
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('tracked_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false });

      if (error) throw error;

      return Response.json({
        success: true,
        accounts: data || []
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('[accounts/manage] error:', error);
    return Response.json({ error: error.message }, { 
      status: error.message.includes('authorization') ? 401 : 500 
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
