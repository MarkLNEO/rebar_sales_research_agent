import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, supabase } = await authenticateRequest(authHeader);

    // Fetch profile and account data
    const [profileResult, criteriaCount, signalPrefsCount, accountsResult] = await Promise.all([
      supabase.from('company_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_custom_criteria').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_signal_preferences').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase
        .from('tracked_accounts')
        .select(`*, recent_signals:account_signals!account_signals_account_id_fkey(*)`)
        .eq('user_id', user.id)
        .gte('account_signals.signal_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('priority', { ascending: false })
    ]);

    const profile = profileResult.data;
    const accounts = accountsResult.data || [];

    // Calculate stats
    const accountStats = {
      total: accounts.length,
      hot: accounts.filter((a: any) => a.priority === 'hot').length,
      warm: accounts.filter((a: any) => a.priority === 'warm').length,
      stale: accounts.filter((a: any) => {
        const lastResearched = a.last_researched_at ? new Date(a.last_researched_at).getTime() : 0;
        return !lastResearched || (Date.now() - lastResearched) > 14 * 24 * 60 * 60 * 1000;
      }).length,
      with_signals: 0
    };

    // Collect signals
    const allSignals: any[] = [];
    for (const account of accounts) {
      const signals = Array.isArray((account as any).recent_signals) ? (account as any).recent_signals : [];
      const unviewed = signals
        .filter((s: any) => !s.viewed)
        .map((s: any) => ({
          id: s.id,
          company_name: account.company_name,
          company_id: account.id,
          signal_type: s.signal_type,
          severity: s.severity,
          description: s.description,
          signal_date: s.signal_date,
          days_ago: Math.floor((Date.now() - new Date(s.signal_date).getTime()) / (1000 * 60 * 60 * 24)),
          source_url: s.source_url
        }));
      
      if (unviewed.length) accountStats.with_signals++;
      allSignals.push(...unviewed);
    }

    // Sort signals by severity and recency
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    allSignals.sort((a, b) => (severityOrder[a.severity] - severityOrder[b.severity]) || (a.days_ago - b.days_ago));
    const topSignals = allSignals.slice(0, 5);

    // Build greeting
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const firstName = user.user_metadata?.name?.split(' ')[0] || user.email?.split('@')[0] || 'there';

    let openingLine = '';
    const suggestions: string[] = [];
    const spotlights: any[] = [];

    if (topSignals.length > 0) {
      const first = topSignals[0];
      openingLine = `${first.company_name} triggered a ${first.severity} signal ${first.days_ago === 0 ? 'today' : `${first.days_ago} day${first.days_ago === 1 ? '' : 's'} ago`}. Want me to dig in?`;
      
      spotlights.push({
        icon: first.severity === 'critical' ? '🚨' : '⚡',
        label: `${first.company_name} · ${first.signal_type.replace(/_/g, ' ')}`,
        detail: 'This is a timely buying signal worth reviewing.',
        prompt: `Research ${first.company_name} and show the implications of this ${first.signal_type.replace(/_/g, ' ')}.`,
        tone: first.severity === 'critical' ? 'critical' : 'info'
      });

      suggestions.push(`Research ${first.company_name} and summarise what's changed`);
      suggestions.push('Which of my accounts had changes this week?');
    } else if (accountStats.hot > 0) {
      openingLine = `${accountStats.hot} of your tracked accounts are hot right now. Want a quick briefing?`;
    } else if (accountStats.total > 0) {
      openingLine = `You're tracking ${accountStats.total} accounts. Want me to highlight the most active ones?`;
    } else {
      openingLine = 'Ready when you are - just name a company and I\'ll prep the intel.';
    }

    if (accountStats.stale > 0) {
      spotlights.push({
        icon: '⏳',
        label: `${accountStats.stale} accounts need a refresh`,
        detail: 'It\'s been 14+ days since the last research run.',
        prompt: 'Refresh the accounts that have not been researched in the last 2 weeks',
        tone: 'info'
      });
    }

    if (suggestions.length < 3) {
      suggestions.push('Tell me about my account portfolio');
      suggestions.push('What can you help me with?');
    }

    return Response.json({
      greeting: { time_of_day: timeOfDay, user_name: firstName },
      signals: topSignals,
      account_stats: accountStats,
      suggestions: suggestions.slice(0, 4),
      opening_line: openingLine,
      spotlights,
      user_context: {
        first_name: firstName,
        role: profile?.user_role,
        industry: profile?.industry,
        accounts_configured: accountStats.total > 0,
        signals_configured: (signalPrefsCount.count || 0) > 0,
        custom_criteria_configured: (criteriaCount.count || 0) > 0
      }
    });

  } catch (error: any) {
    console.error('[greeting] error:', error);
    return Response.json({ error: error.message }, { 
      status: error.message.includes('authorization') ? 401 : 500 
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
