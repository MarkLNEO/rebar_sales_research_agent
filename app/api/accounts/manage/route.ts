import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';
import { slugToTitle } from '../../../../src/utils/string';

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

    if (action === 'delete') {
      const accountId: string | undefined = body?.account_id;
      const companyName: string | undefined = body?.company_name;

      const idTargets = new Set<string>();
      const nameTargets = new Set<string>();
      if (accountId && typeof accountId === 'string') {
        idTargets.add(accountId);
      }
      if (companyName && typeof companyName === 'string') {
        nameTargets.add(companyName);
      }
      if (Array.isArray(companies) && companies.length > 0) {
        for (const entry of companies) {
          if (entry?.id && typeof entry.id === 'string') {
            idTargets.add(entry.id);
          } else if (entry?.company_name && typeof entry.company_name === 'string') {
            nameTargets.add(entry.company_name);
          } else if (entry?.name && typeof entry.name === 'string') {
            nameTargets.add(entry.name);
          }
        }
      }

      if (idTargets.size === 0 && nameTargets.size === 0) {
        return Response.json({ error: 'Missing account identifier' }, { status: 400 });
      }

      let removed = 0;
      if (idTargets.size > 0) {
        const { error, data } = await supabase
          .from('tracked_accounts')
          .delete()
          .eq('user_id', user.id)
          .in('id', Array.from(idTargets))
          .select('id');
        if (error) throw error;
        removed += data?.length ?? 0;
      }
      if (nameTargets.size > 0) {
        const { error, data } = await supabase
          .from('tracked_accounts')
          .delete()
          .eq('user_id', user.id)
          .in('company_name', Array.from(nameTargets))
          .select('id');
        if (error) throw error;
        removed += data?.length ?? 0;
      }

      return Response.json({
        success: true,
        removed
      });
    }

    if (action === 'update' && body?.company_name && body?.updates) {
      const { company_name, updates } = body;
      const { data, error } = await supabase
        .from('tracked_accounts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('company_name', company_name)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      return Response.json({
        success: true,
        account: data,
      });
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('tracked_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false });

      if (error) throw error;

      const accounts = data || [];
      const accountIds = accounts.map((account: any) => account.id).filter((id: any): id is string => typeof id === 'string' && id.length > 0);

      const signalsByAccount = new Map<string, any[]>();
      const researchByAccount = new Map<string, any[]>();

      if (accountIds.length > 0) {
        const { data: signalRows, error: signalsError } = await supabase
          .from('account_signals')
          .select('id, account_id, signal_type, severity, description, signal_date, source_url, viewed, score')
          .in('account_id', accountIds)
          .order('signal_date', { ascending: false });
        if (signalsError) throw signalsError;
        for (const row of signalRows || []) {
          if (!row?.account_id) continue;
          const bucket = signalsByAccount.get(row.account_id) ?? [];
          bucket.push(row);
          signalsByAccount.set(row.account_id, bucket);
        }

        try {
          const { data: researchRows, error: researchError } = await supabase
            .from('research_outputs')
            .select(
              'id, account_id, subject, research_type, created_at, executive_summary, markdown_report, sources, metadata, icp_fit_score, signal_score, composite_score, priority_level, confidence_level'
            )
            .in('account_id', accountIds)
            .order('created_at', { ascending: false });
          if (researchError) {
            console.warn('[accounts/manage] research_outputs query failed (schema mismatch tolerated):', researchError.message);
          } else {
            for (const row of researchRows || []) {
              if (!row?.account_id) continue;
              const bucket = researchByAccount.get(row.account_id) ?? [];
              bucket.push(row);
              researchByAccount.set(row.account_id, bucket);
            }
          }
        } catch (e: any) {
          console.warn('[accounts/manage] research_outputs query error (tolerated):', e?.message || e);
        }
      }

      const decorated = accounts.map((account: any) => {
        const signals = signalsByAccount.get(account.id) ?? [];
        const recentSignals = signals.slice(0, 5).map(signal => ({
          ...signal,
          summary: signal.description || (signal.signal_type ? slugToTitle(signal.signal_type) : ''),
        }));
        const unviewed = signals.filter(signal => !signal.viewed).length;
        const researchHistory = researchByAccount.get(account.id) ?? [];
        const latestResearch = researchHistory[0];
        const latestSignal = signals[0];

        const derivedSignalScore =
          signals.length === 0
            ? null
            : typeof account.signal_score === 'number' && account.signal_score > 0
              ? account.signal_score
              : Math.min(
                  100,
                  Math.round(
                    signals.reduce((total, signal) => total + (typeof signal.score === 'number' ? signal.score : 50), 0) /
                      signals.length
                  )
                );

        return {
          ...account,
          signal_count: signals.length,
          unviewed_signal_count: unviewed,
          recent_signals: recentSignals,
          latest_signal: latestSignal || null,
          latest_signal_detected_at: latestSignal?.signal_date ?? null,
          signal_score: derivedSignalScore,
          last_researched_at: account.last_researched_at || latestResearch?.created_at || null,
          last_research_summary: account.last_research_summary || latestResearch?.executive_summary || null,
          research_history: researchHistory,
        };
      });

      const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
      const stats = {
        total: decorated.length,
        hot: decorated.filter((a: any) => a.priority === 'hot').length,
        warm: decorated.filter((a: any) => a.priority === 'warm').length,
        standard: decorated.filter((a: any) => a.priority === 'standard').length,
        stale: decorated.filter((a: any) => {
          const lastResearched = a.last_researched_at ? new Date(a.last_researched_at).getTime() : 0;
          return !lastResearched || (Date.now() - lastResearched) > FOURTEEN_DAYS_MS;
        }).length,
        with_signals: decorated.filter((a: any) => Array.isArray(a.recent_signals) && a.recent_signals.length > 0).length,
      };

      return Response.json({
        success: true,
        accounts: decorated,
        stats,
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
