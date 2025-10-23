import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { loadFullUserContext } from '../../lib/contextLoader';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/research/bulk-runner
 *
 * Processes pending bulk research tasks for a given job.
 * Runs research for each company using OpenAI and saves results.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job_id, concurrency = 3 } = body;

    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    console.log(`[bulk-runner] Starting runner for job ${job_id} with concurrency ${concurrency}`);

    // Use service role key to bypass RLS since this runs in background
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('bulk_research_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      console.error('[bulk-runner] Job not found:', jobError);
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Update job status to running
    await supabase
      .from('bulk_research_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    console.log(`[bulk-runner] Job ${job_id} status updated to running`);

    // Get pending tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('bulk_research_tasks')
      .select('*')
      .eq('job_id', job_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('[bulk-runner] Failed to fetch tasks:', tasksError);
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      console.log(`[bulk-runner] No pending tasks found for job ${job_id}`);
      return Response.json({
        success: true,
        message: 'No pending tasks',
        job_id,
      });
    }

    console.log(`[bulk-runner] Found ${tasks.length} pending tasks`);

    // Load user context for research
    const fullContext = await loadFullUserContext(supabase, job.user_id, 'company_research');

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Process tasks with concurrency control
    const processTask = async (task: any) => {
      try {
        console.log(`[bulk-runner] Processing task ${task.id} for company: ${task.company}`);

        // Update task status to running
        await supabase
          .from('bulk_research_tasks')
          .update({
            status: 'running',
            started_at: new Date().toISOString(),
            attempt_count: task.attempt_count + 1,
          })
          .eq('id', task.id);

        // Build research prompt based on job research_type
        const isQuickMode = job.research_type === 'quick';
        const researchPrompt = isQuickMode
          ? `Research ${task.company}. Provide a quick brief (400-600 words) with:
1. Executive Summary (2-3 sentences)
2. Why Now (2-3 recent signals with dates)
3. Key Decision Maker (1-2 contacts)
4. Next Step (one specific action)

Focus on speed and conciseness.`
          : `Research ${task.company}. Provide comprehensive analysis including:
- Executive summary
- Company background (industry, size, location, founded)
- Leadership team with LinkedIn profiles
- Recent buying signals and market activity
- ICP fit assessment
- Custom criteria evaluation
- Personalization points for outreach
- Recommended actions

Be thorough and detailed.`;

        // Mode-specific instructions
        const modeInstructions = isQuickMode
          ? `\n\n## QUICK BRIEF MODE
You are in Quick Brief mode. Provide a concise, scannable brief (400-600 words max).
Use bullet points. Limit web searches to 2-3 max for speed.`
          : `\n\n## DEEP INTELLIGENCE MODE
You are in Deep Intelligence mode. Provide comprehensive analysis with detailed findings.
Use thorough web research to gather all available information.`;

        const instructions = fullContext.systemPrompt + modeInstructions;

        // Run research using OpenAI Responses API
        const response = await openai.responses.create({
          model: process.env.OPENAI_MODEL || 'gpt-5-mini',
          instructions,
          input: researchPrompt,
          text: { format: { type: 'text' } },
          max_output_tokens: isQuickMode ? 4000 : 12000,
          tools: [{ type: 'web_search' as any }],
          reasoning: {
            effort: isQuickMode ? 'low' : 'medium',
          } as any,
        });

        // Log the full response structure for debugging
        console.log(`[bulk-runner] Response structure for ${task.company}:`, JSON.stringify(response, null, 2).substring(0, 500));

        // Extract text from response - try multiple paths
        let researchText = 'No research output generated';
        const output = (response as any).output;

        if (output && Array.isArray(output)) {
          for (const item of output) {
            // Try content array (for text outputs)
            if (item.content && Array.isArray(item.content)) {
              for (const content of item.content) {
                if (content.text) {
                  researchText = content.text;
                  break;
                }
              }
            }
            // Try direct text property
            if (item.text) {
              researchText = item.text;
              break;
            }
            if (researchText !== 'No research output generated') break;
          }
        }

        console.log(`[bulk-runner] Research completed for ${task.company} (${researchText.length} chars)`);

        // Save research output
        const { data: researchOutput, error: outputError } = await supabase
          .from('research_outputs')
          .insert({
            user_id: job.user_id,
            research_type: 'company',
            subject: task.company,
            data: { raw_research: researchText },
            markdown_report: researchText,
            executive_summary: researchText.split('\n').slice(0, 3).join(' ').substring(0, 500),
            tokens_used: response.usage?.total_tokens || 0,
            confidence_level: 'medium',
            source_task_id: task.id,
          })
          .select()
          .single();

        if (outputError) {
          console.error(`[bulk-runner] Failed to save research output for ${task.company}:`, outputError);
          throw outputError;
        }

        console.log(`[bulk-runner] Saved research output ${researchOutput.id} for ${task.company}`);

        // Update task as completed
        await supabase
          .from('bulk_research_tasks')
          .update({
            status: 'completed',
            result: researchOutput.id,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        // Update job completed count
        const { data: updatedJob } = await supabase
          .from('bulk_research_jobs')
          .select('completed_count, total_count')
          .eq('id', job_id)
          .single();

        const newCompletedCount = (updatedJob?.completed_count || 0) + 1;
        const isJobComplete = newCompletedCount >= (updatedJob?.total_count || 0);

        await supabase
          .from('bulk_research_jobs')
          .update({
            completed_count: newCompletedCount,
            status: isJobComplete ? 'completed' : 'running',
            completed_at: isJobComplete ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job_id);

        console.log(`[bulk-runner] Task ${task.id} completed. Job progress: ${newCompletedCount}/${updatedJob?.total_count}`);

        return { success: true, task_id: task.id, company: task.company };

      } catch (error: any) {
        console.error(`[bulk-runner] Task ${task.id} failed:`, error);

        // Update task as failed
        await supabase
          .from('bulk_research_tasks')
          .update({
            status: 'failed',
            error: error.message || 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        return { success: false, task_id: task.id, company: task.company, error: error.message };
      }
    };

    // Process tasks with concurrency limit
    const results = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(processTask));
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[bulk-runner] Job ${job_id} processing complete. Success: ${successCount}, Failed: ${failureCount}`);

    return Response.json({
      success: true,
      job_id,
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      results,
    });

  } catch (error: any) {
    console.error('[bulk-runner] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to process bulk research' },
      { status: 500 }
    );
  }
}
