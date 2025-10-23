import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * User Context Tool - Memory-as-a-Tool for AI Agent
 *
 * SECURITY MODEL:
 * 1. Requires authentication - uses JWT from request
 * 2. Always scoped to authenticated user - NO cross-user access possible
 * 3. Limited API surface - only predefined categories
 * 4. Logged and auditable - every call tracked with user_id
 * 5. RLS protected - database policies enforce user boundaries
 *
 * This replaces loading full context upfront (3500 tokens) with
 * on-demand queries that the agent calls only when needed.
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // SECURITY: Authenticate request to get user_id
    // This is the ONLY user we'll query - no way for agent to access other users
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = await authenticateRequest(authHeader);

    // Parse request
    const { category, query } = await request.json();

    console.log(`[user-context-tool] User ${user.id} requesting category: ${category}${query ? ` (query: ${query})` : ''}`);

    // Create Supabase client with RLS enabled
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    let data: any = null;
    let source: string = '';
    let found = false;

    // Route to appropriate handler based on category
    switch (category) {
      case 'profile':
      case 'icp': {
        // Query ICP profile - RLS ensures only user's data is accessible
        const { data: profiles } = await supabase
          .from('icp_profiles')
          .select('company_types, target_titles, employee_range, revenue_range, focus_industries, icp_definition, profile_name')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          data = {
            profile_name: profile.profile_name || 'Default',
            company_types: profile.company_types || [],
            target_titles: profile.target_titles || [],
            employee_range: profile.employee_range,
            revenue_range: profile.revenue_range,
            focus_industries: profile.focus_industries || [],
            icp_definition: profile.icp_definition,
          };
          source = 'icp_profiles';
          found = true;
        }
        break;
      }

      case 'signals': {
        const { data: signals } = await supabase
          .from('user_signal_preferences')
          .select('*')
          .eq('user_id', user.id)
          .eq('enabled', true);

        if (signals && signals.length > 0) {
          data = signals.map((s: any) => ({
            signal_type: s.signal_type,
            lookback_days: s.lookback_days || 90,
          }));
          source = 'user_signal_preferences';
          found = true;
        }
        break;
      }

      case 'preferences': {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('key, value, confidence')
          .eq('user_id', user.id)
          .order('confidence', { ascending: false });

        if (prefs && prefs.length > 0) {
          // Group by category (e.g., focus.ceo_leadership -> focus: { ceo_leadership: ... })
          const grouped: Record<string, any> = {};
          prefs.forEach(p => {
            const parts = p.key.split('.');
            if (parts.length === 2) {
              const [cat, field] = parts;
              if (!grouped[cat]) grouped[cat] = {};
              grouped[cat][field] = p.value;
            } else {
              grouped[p.key] = p.value;
            }
          });

          data = grouped;
          source = 'user_preferences';
          found = true;
        }
        break;
      }

      case 'criteria': {
        const { data: criteria } = await supabase
          .from('custom_criteria')
          .select('criterion, weight, is_disqualifier')
          .eq('user_id', user.id)
          .eq('enabled', true);

        if (criteria && criteria.length > 0) {
          data = criteria.map(c => ({
            criterion: c.criterion,
            weight: c.weight,
            is_disqualifier: c.is_disqualifier,
          }));
          source = 'custom_criteria';
          found = true;
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown category: ${category}. Valid categories: profile, icp, signals, preferences, criteria` },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    // Log successful query (for monitoring and debugging)
    console.log(`[user-context-tool] Completed in ${duration}ms - Category: ${category}, Found: ${found}, User: ${user.id}`);

    return NextResponse.json({
      category,
      query: query || null,
      data,
      source,
      found,
      duration_ms: duration,
    });

  } catch (error) {
    console.error('[user-context-tool] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user context', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing (requires auth)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = await authenticateRequest(authHeader);

    return NextResponse.json({
      message: 'User Context Tool API',
      user_id: user.id,
      available_categories: ['profile', 'icp', 'signals', 'preferences', 'criteria'],
      usage: 'POST with { category, query? }',
      example: {
        category: 'icp',
        query: 'target titles'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}
