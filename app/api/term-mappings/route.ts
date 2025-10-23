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

    // Fetch term mappings ordered by usage
    const { data: termMappings, error } = await supabase
      .from('user_term_mappings')
      .select('*')
      .eq('user_id', user.id)
      .order('use_count', { ascending: false });

    if (error) {
      console.error('Error fetching term mappings:', error);
      return NextResponse.json({ error: 'Failed to fetch term mappings' }, { status: 500 });
    }

    return NextResponse.json({
      termMappings: termMappings || [],
      count: termMappings?.length || 0,
    });
  } catch (error) {
    console.error('Term mappings GET error:', error);
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
    const { term, expansion, context } = body;

    if (!term || !expansion) {
      return NextResponse.json(
        { error: 'Missing required fields: term and expansion' },
        { status: 400 }
      );
    }

    // Normalize term to lowercase for consistency
    const normalizedTerm = term.toLowerCase().trim();

    // Upsert term mapping (unique constraint is on user_id + term)
    const { data, error } = await supabase
      .from('user_term_mappings')
      .upsert(
        {
          user_id: user.id,
          term: normalizedTerm,
          expansion: expansion.trim(),
          context: context?.trim() || null,
          confirmed_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          use_count: 1,
        },
        {
          onConflict: 'user_id,term',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting term mapping:', error);
      return NextResponse.json({ error: 'Failed to save term mapping' }, { status: 500 });
    }

    return NextResponse.json({ success: true, termMapping: data });
  } catch (error) {
    console.error('Term mappings POST error:', error);
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

    // Get term from query params
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term');

    if (!term) {
      return NextResponse.json(
        { error: 'Missing required parameter: term' },
        { status: 400 }
      );
    }

    // Delete term mapping
    const { error } = await supabase
      .from('user_term_mappings')
      .delete()
      .eq('user_id', user.id)
      .eq('term', term.toLowerCase().trim());

    if (error) {
      console.error('Error deleting term mapping:', error);
      return NextResponse.json({ error: 'Failed to delete term mapping' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Term mappings DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
