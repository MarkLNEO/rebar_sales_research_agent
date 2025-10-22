import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types';
import { invalidateUserCache } from '../../lib/contextCache';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * API endpoint to update user preferences
 * This allows the agent to learn and adapt to user preferences over time
 * 
 * Supports updating:
 * - Custom terminology (signal_terminology, criteria_terminology, watchlist_label)
 * - Learned preferences (research depth, output style, tone)
 * - Focus areas and priorities
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      signal_terminology,
      criteria_terminology,
      watchlist_label,
      preferences 
    } = body;

    // Update user profile with custom terminology
    if (signal_terminology || criteria_terminology || watchlist_label) {
      const updates: any = {};
      if (signal_terminology) updates.signal_terminology = signal_terminology;
      if (criteria_terminology) updates.criteria_terminology = criteria_terminology;
      if (watchlist_label) updates.watchlist_label = watchlist_label;

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile terminology:', profileError);
        return NextResponse.json({ error: 'Failed to update terminology' }, { status: 500 });
      }
    }

    // Update learned preferences in user_preferences table
    if (preferences && typeof preferences === 'object') {
      const preferenceUpdates = [];

      for (const [key, value] of Object.entries(preferences)) {
        preferenceUpdates.push(
          supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              key,
              value: value as any,
              source: 'explicit', // User explicitly stated this preference
              confidence: 1.0, // High confidence for explicit preferences
              updated_at: new Date().toISOString()
            })
        );
      }

      const results = await Promise.all(preferenceUpdates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        console.error('Error updating preferences:', errors);
        return NextResponse.json({ error: 'Failed to update some preferences' }, { status: 500 });
      }
    }

    // Invalidate user context cache so next request fetches fresh data
    invalidateUserCache(user.id);
    console.log('[preferences update] Invalidated context cache for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      updated: {
        terminology: !!(signal_terminology || criteria_terminology || watchlist_label),
        preferences: !!preferences
      }
    });

  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve current preference settings
 * Useful for showing users what the agent has learned about them
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get profile with custom terminology
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('signal_terminology, criteria_terminology, watchlist_label, show_watchlist_always')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Get learned preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({
      terminology: {
        signals: profile?.signal_terminology || 'Buying Signals',
        criteria: profile?.criteria_terminology || 'Custom Criteria',
        watchlist: profile?.watchlist_label || 'Watchlist'
      },
      preferences: preferences || [],
      show_watchlist_always: profile?.show_watchlist_always ?? true
    });

  } catch (error) {
    console.error('Preferences GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
