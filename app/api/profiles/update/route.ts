import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';

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
      const { error } = await supabase
        .from('company_profiles')
        .upsert({
          user_id: user.id,
          ...profile,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      results.profile = 'updated';
    }

    // Update custom criteria
    if (Array.isArray(custom_criteria)) {
      // Delete existing
      await supabase.from('user_custom_criteria').delete().eq('user_id', user.id);
      
      // Insert new
      if (custom_criteria.length > 0) {
        const { error } = await supabase
          .from('user_custom_criteria')
          .insert(custom_criteria.map((c, idx) => ({
            user_id: user.id,
            field_name: c.field_name,
            field_type: c.field_type || 'text',
            importance: c.importance || 'optional',
            hints: c.hints || [],
            display_order: idx
          })));
        
        if (error) throw error;
      }
      results.custom_criteria = custom_criteria.length;
    }

    // Update signal preferences
    if (Array.isArray(signal_preferences)) {
      await supabase.from('user_signal_preferences').delete().eq('user_id', user.id);
      
      if (signal_preferences.length > 0) {
        const { error } = await supabase
          .from('user_signal_preferences')
          .insert(signal_preferences.map(s => ({
            user_id: user.id,
            signal_type: s.signal_type,
            importance: s.importance || 'nice_to_have',
            lookback_days: s.lookback_days || 90,
            config: s.config || {}
          })));
        
        if (error) throw error;
      }
      results.signal_preferences = signal_preferences.length;
    }

    // Update disqualifying criteria
    if (Array.isArray(disqualifying_criteria)) {
      await supabase.from('user_disqualifying_criteria').delete().eq('user_id', user.id);
      
      if (disqualifying_criteria.length > 0) {
        const { error } = await supabase
          .from('user_disqualifying_criteria')
          .insert(disqualifying_criteria.map(d => ({
            user_id: user.id,
            criterion: d.criterion
          })));
        
        if (error) throw error;
      }
      results.disqualifying_criteria = disqualifying_criteria.length;
    }

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
