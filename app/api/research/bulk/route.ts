import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/research/bulk
 *
 * Creates a bulk research job with individual tasks for each company.
 * Returns the job_id for tracking progress.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, supabase } = await authenticateRequest(authHeader);

    const body = await req.json();
    const { companies, research_type = 'quick' } = body;

    if (!Array.isArray(companies) || companies.length === 0) {
      return Response.json(
        { error: 'companies must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!['quick', 'deep'].includes(research_type)) {
      return Response.json(
        { error: 'research_type must be "quick" or "deep"' },
        { status: 400 }
      );
    }

    console.log(`[bulk-research] Creating job for ${companies.length} companies (${research_type} mode)`);

    // Create the bulk research job
    const { data: job, error: jobError } = await supabase
      .from('bulk_research_jobs')
      .insert({
        user_id: user.id,
        companies,
        research_type,
        status: 'pending',
        total_count: companies.length,
        completed_count: 0,
        results: null,
      })
      .select()
      .single();

    if (jobError) {
      console.error('[bulk-research] Failed to create job:', jobError);
      throw jobError;
    }

    console.log(`[bulk-research] Created job ${job.id}`);

    // Create individual tasks for each company
    const tasks = companies.map(company => ({
      job_id: job.id,
      user_id: user.id,
      company: company,
      status: 'pending',
      attempt_count: 0,
    }));

    const { error: tasksError } = await supabase
      .from('bulk_research_tasks')
      .insert(tasks);

    if (tasksError) {
      console.error('[bulk-research] Failed to create tasks:', tasksError);
      // Rollback: delete the job
      await supabase.from('bulk_research_jobs').delete().eq('id', job.id);
      throw tasksError;
    }

    console.log(`[bulk-research] Created ${tasks.length} tasks for job ${job.id}`);

    return Response.json({
      success: true,
      job_id: job.id,
      total_count: companies.length,
      research_type,
    });

  } catch (error: any) {
    console.error('[bulk-research] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to create bulk research job' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, supabase } = await authenticateRequest(authHeader);

    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');

    if (!jobId) {
      // Return all jobs for this user
      const { data: jobs, error } = await supabase
        .from('bulk_research_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return Response.json({ jobs: jobs || [] });
    }

    // Return specific job with tasks
    const { data: job, error: jobError } = await supabase
      .from('bulk_research_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError) throw jobError;
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get tasks for this job
    const { data: tasks, error: tasksError } = await supabase
      .from('bulk_research_tasks')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (tasksError) throw tasksError;

    return Response.json({
      job,
      tasks: tasks || [],
    });

  } catch (error: any) {
    console.error('[bulk-research] GET error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch bulk research job' },
      { status: 500 }
    );
  }
}
