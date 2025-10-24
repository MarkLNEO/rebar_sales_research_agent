import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';
import { invalidateUserCache } from '../../lib/contextCache';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, supabase } = await authenticateRequest(authHeader);
    const body = await req.json();

    const {
      profile,
      custom_criteria,
      signal_preferences,
      disqualifying_criteria
    } = body;

    const results: any = {};

    // Update profile
    if (profile) {
      // Whitelist of valid company_profiles columns
      const validColumns = [
        'company_name', 'company_url', 'linkedin_url', 'youtube_channel',
        'additional_sources', 'competitors', 'research_focus', 'metadata',
        'onboarding_complete', 'onboarding_step', 'onboarding_data',
        'user_role', 'use_case', 'industry', 'icp_definition',
        'target_titles', 'seniority_levels', 'target_departments',
        'output_format', 'output_style', 'default_report_sections',
        'report_detail_level', 'signal_terminology', 'criteria_terminology',
        'watchlist_label', 'show_watchlist_always'
      ];

      // Map common field names to database column names to prevent errors
      const mappedProfile: any = {};

      Object.keys(profile).forEach(key => {
        const value = profile[key];
        // Map ICP -> icp_definition
        if (key === 'ICP') {
          mappedProfile.icp_definition = value;
        }
        // Map company -> company_name
        else if (key === 'company') {
          mappedProfile.company_name = value;
        }
        // Map industry variations
        else if (key === 'Industry') {
          mappedProfile.industry = value;
        }
        // Only allow valid database columns
        else if (validColumns.includes(key)) {
          mappedProfile[key] = value;
        }
        // Silently ignore invalid columns instead of erroring
        else {
          console.log(`[profile update] Ignoring invalid column: ${key}`);
        }
      });

      // Check if profile exists first
      const { data: existing } = await supabase
        .from('company_profiles')
        .select('id, company_name')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Profile exists - UPDATE only the fields provided
        const { error } = await supabase
          .from('company_profiles')
          .update({
            ...mappedProfile,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // No profile exists - INSERT with required fields
        // If company_name not provided, generate a placeholder
        if (!mappedProfile.company_name) {
          mappedProfile.company_name = `User ${user.id.substring(0, 8)} Company`;
        }

        const { error } = await supabase
          .from('company_profiles')
          .insert({
            user_id: user.id,
            ...mappedProfile,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      results.profile = 'updated';
    }

    // Update custom criteria
    if (Array.isArray(custom_criteria)) {
      // Filter out invalid criteria (missing field_name)
      const validCriteria = custom_criteria.filter(c =>
        c && typeof c.field_name === 'string' && c.field_name.trim().length > 0
      );

      // Delete existing
      await supabase.from('user_custom_criteria').delete().eq('user_id', user.id);

      // Insert new (only if we have valid criteria)
      if (validCriteria.length > 0) {
        const { error } = await supabase
          .from('user_custom_criteria')
          .insert(validCriteria.map((c, idx) => ({
            user_id: user.id,
            field_name: c.field_name.trim(),
            field_type: c.field_type || 'text',
            importance: c.importance || 'optional',
            hints: c.hints || [],
            display_order: idx
          })));

        if (error) throw error;
      }
      results.custom_criteria = validCriteria.length;
    }

    // Update signal preferences
    if (Array.isArray(signal_preferences)) {
      // Filter out invalid signals (missing signal_type)
      const validSignals = signal_preferences.filter(s =>
        s && typeof s.signal_type === 'string' && s.signal_type.trim().length > 0
      );

      await supabase.from('user_signal_preferences').delete().eq('user_id', user.id);

      if (validSignals.length > 0) {
        const { error } = await supabase
          .from('user_signal_preferences')
          .insert(validSignals.map(s => ({
            user_id: user.id,
            signal_type: s.signal_type.trim(),
            importance: s.importance || 'nice_to_have',
            lookback_days: s.lookback_days || 90,
            config: s.config || {}
          })));

        if (error) throw error;
      }
      results.signal_preferences = validSignals.length;
    }

    // Update disqualifying criteria
    if (Array.isArray(disqualifying_criteria)) {
      // Filter out invalid criteria (missing criterion)
      const validDisqualifiers = disqualifying_criteria.filter(d =>
        d && typeof d.criterion === 'string' && d.criterion.trim().length > 0
      );

      await supabase.from('user_disqualifying_criteria').delete().eq('user_id', user.id);

      if (validDisqualifiers.length > 0) {
        const { error } = await supabase
          .from('user_disqualifying_criteria')
          .insert(validDisqualifiers.map(d => ({
            user_id: user.id,
            criterion: d.criterion.trim()
          })));

        if (error) throw error;
      }
      results.disqualifying_criteria = validDisqualifiers.length;
    }

    // Invalidate user context cache so next request fetches fresh data
    invalidateUserCache(user.id);
    console.log('[profile update] Invalidated context cache for user:', user.id);

    return Response.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('[profile update] error:', error);
    return Response.json({ error: error.message }, { 
      status: error.message.includes('authorization') ? 401 : 500 
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
