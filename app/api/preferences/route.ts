import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/supabase/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client with service role for admin access
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch user preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Transform preferences into a key-value object
    const prefsMap: Record<string, any> = {};
    if (preferences) {
      for (const pref of preferences) {
        prefsMap[pref.key] = {
          value: pref.value,
          source: pref.source,
          confidence: pref.confidence,
          updated_at: pref.updated_at,
        };
      }
    }

    // Transform into resolved preferences format
    const resolved: any = {};
    
    // Group preferences by category
    for (const [key, pref] of Object.entries(prefsMap)) {
      const parts = key.split('.');
      if (parts.length === 2) {
        const [category, field] = parts;
        if (!resolved[category]) resolved[category] = {};
        resolved[category][field] = pref.value;
        resolved[category][`${field}_confidence`] = pref.confidence;
      } else {
        resolved[key] = pref.value;
      }
    }
    
    return NextResponse.json({
      preferences: prefsMap,
      resolved: resolved,
      count: preferences?.length || 0,
    });
  } catch (error) {
    console.error('Preferences API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { key, value, source = 'system', confidence = 0.8 } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: key and value' },
        { status: 400 }
      );
    }

    // Upsert preference (unique constraint is on user_id + key)
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          key,
          value,
          source,
          confidence,
          updated_at: new Date().toISOString(),
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting preference:', error);
      return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preference: data });
  } catch (error) {
    console.error('Preferences POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get key from query params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Missing required parameter: key' },
        { status: 400 }
      );
    }

    // Delete preference
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', user.id)
      .eq('key', key);

    if (error) {
      console.error('Error deleting preference:', error);
      return NextResponse.json({ error: 'Failed to delete preference' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Preferences DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
