import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface DetectedSignal {
  signal_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  signal_date: string;
  source_url?: string;
  importance: 'critical' | 'important' | 'nice_to_have';
  score: number;
}

/**
 * POST /api/signals/detect
 *
 * Background worker that detects signals for tracked accounts.
 * Can be called manually or via cron job.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account_id, force = false } = body;

    console.log('[signal-detect] Starting signal detection', { account_id, force });

    // Use service role key to bypass RLS
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

    // Get tracked accounts that need signal detection
    let query = supabase
      .from('tracked_accounts')
      .select('*')
      .eq('monitoring_enabled', true);

    if (account_id) {
      query = query.eq('id', account_id);
    } else {
      // Only check accounts that haven't been checked in the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      if (!force) {
        query = query.or(`last_researched_at.is.null,last_researched_at.lt.${yesterday}`);
      }
    }

    const { data: accounts, error: accountsError } = await query.limit(10);

    if (accountsError) {
      console.error('[signal-detect] Failed to fetch accounts:', accountsError);
      throw accountsError;
    }

    if (!accounts || accounts.length === 0) {
      console.log('[signal-detect] No accounts to process');
      return Response.json({
        success: true,
        message: 'No accounts to process',
        processed: 0,
      });
    }

    console.log(`[signal-detect] Processing ${accounts.length} accounts`);

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Process each account
    const results = [];
    for (const account of accounts) {
      try {
        console.log(`[signal-detect] Processing account: ${account.company_name}`);

        // Get user's signal preferences
        const { data: signalPrefs } = await supabase
          .from('user_signal_preferences')
          .select('*')
          .eq('user_id', account.user_id);

        const preferences = signalPrefs || [];
        const signalTypes = preferences.length > 0
          ? preferences.map(p => p.signal_type).join(', ')
          : 'leadership changes, funding rounds, hiring surges, security breaches, product launches, partnerships, M&A activity';

        const lookbackDays = preferences.length > 0
          ? Math.max(...preferences.map(p => p.lookback_days || 90))
          : 90;

        // Build signal detection prompt
        const signalPrompt = `Search for recent business signals and news for ${account.company_name}.

Look for these types of signals: ${signalTypes}

Focus on events from the last ${lookbackDays} days.

For each signal found, provide:
1. Signal type (e.g., "leadership_change", "funding_round", "security_breach")
2. Severity (critical, high, medium, low)
3. Description (brief, 1-2 sentences)
4. Date (YYYY-MM-DD format)
5. Source URL (if available)
6. Importance (critical, important, nice_to_have)
7. Score (0-100, based on relevance and urgency)

Return ONLY a JSON array of signals in this exact format:
[
  {
    "signal_type": "leadership_change",
    "severity": "high",
    "description": "New CTO hired with AI background",
    "signal_date": "2025-01-15",
    "source_url": "https://example.com/article",
    "importance": "important",
    "score": 75
  }
]

If no signals found, return an empty array: []`;

        // Run signal detection
        const response = await openai.responses.create({
          model: process.env.OPENAI_MODEL || 'gpt-5-mini',
          instructions: 'You are a business intelligence analyst. Your job is to find and categorize buying signals for B2B sales teams. Always return valid JSON.',
          input: signalPrompt,
          text: { format: { type: 'text' } },
          max_output_tokens: 4000,
          tools: [{ type: 'web_search' as any }],
          reasoning: {
            effort: 'low',
          } as any,
        });

        // Extract text from response - try multiple paths
        let responseText = '[]';
        const output = (response as any).output;

        if (output && Array.isArray(output)) {
          for (const item of output) {
            if (item.content && Array.isArray(item.content)) {
              for (const content of item.content) {
                if (content.text) {
                  responseText = content.text;
                  break;
                }
              }
            }
            if (item.text) {
              responseText = item.text;
              break;
            }
            if (responseText !== '[]') break;
          }
        }

        console.log(`[signal-detect] Raw response for ${account.company_name}:`, responseText.substring(0, 500));

        // Parse signals from response
        let detectedSignals: DetectedSignal[] = [];
        try {
          // Extract JSON array from response
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            detectedSignals = JSON.parse(jsonMatch[0]);
          } else {
            console.log(`[signal-detect] No JSON array found in response for ${account.company_name}`);
          }
        } catch (parseError) {
          console.error(`[signal-detect] Failed to parse signals for ${account.company_name}:`, parseError);
        }

        console.log(`[signal-detect] Detected ${detectedSignals.length} signals for ${account.company_name}`);

        // Save detected signals to database
        let newSignalsCount = 0;
        if (detectedSignals.length > 0) {
          const signalRecords = detectedSignals.map(signal => ({
            account_id: account.id,
            user_id: account.user_id,
            signal_type: signal.signal_type,
            severity: signal.severity,
            description: signal.description,
            signal_date: signal.signal_date,
            source_url: signal.source_url,
            importance: signal.importance,
            score: signal.score || 50,
            viewed: false,
            dismissed: false,
            detection_source: 'gpt_web_search',
            raw_payload: signal,
          }));

          const { data: insertedSignals, error: signalsError } = await supabase
            .from('account_signals')
            .insert(signalRecords)
            .select();

          if (signalsError) {
            console.error(`[signal-detect] Failed to save signals for ${account.company_name}:`, signalsError);
          } else {
            newSignalsCount = insertedSignals?.length || 0;
            console.log(`[signal-detect] Saved ${newSignalsCount} new signals for ${account.company_name}`);
          }
        }

        // Calculate account signal score (based on unviewed signals)
        const { data: unviewedSignals } = await supabase
          .from('account_signals')
          .select('score')
          .eq('account_id', account.id)
          .eq('viewed', false);

        const signalScore = unviewedSignals && unviewedSignals.length > 0
          ? Math.min(100, Math.round(unviewedSignals.reduce((sum, s) => sum + (s.score || 0), 0) / unviewedSignals.length))
          : 0;

        // Determine priority based on signal score
        let priority: 'hot' | 'warm' | 'standard' = 'standard';
        if (signalScore >= 80) priority = 'hot';
        else if (signalScore >= 60) priority = 'warm';

        // Update tracked account
        await supabase
          .from('tracked_accounts')
          .update({
            last_researched_at: new Date().toISOString(),
            signal_score: signalScore,
            priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);

        // Log activity
        await supabase
          .from('signal_activity_log')
          .insert({
            user_id: account.user_id,
            account_id: account.id,
            signal_type: 'multiple',
            detector: 'gpt_web_search',
            status: newSignalsCount > 0 ? 'success' : 'noop',
            details: {
              signals_found: detectedSignals.length,
              signals_saved: newSignalsCount,
              signal_score: signalScore,
              priority,
            },
            detected_signals: newSignalsCount,
          });

        results.push({
          success: true,
          account_id: account.id,
          company_name: account.company_name,
          signals_detected: detectedSignals.length,
          signals_saved: newSignalsCount,
          signal_score: signalScore,
          priority,
        });

      } catch (error: any) {
        console.error(`[signal-detect] Error processing ${account.company_name}:`, error);

        // Log error
        await supabase
          .from('signal_activity_log')
          .insert({
            user_id: account.user_id,
            account_id: account.id,
            signal_type: 'multiple',
            detector: 'gpt_web_search',
            status: 'error',
            details: { error: error.message },
            detected_signals: 0,
          });

        results.push({
          success: false,
          account_id: account.id,
          company_name: account.company_name,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalSignals = results.reduce((sum, r) => sum + ((r as any).signals_saved || 0), 0);

    console.log(`[signal-detect] Complete. Processed ${results.length} accounts, detected ${totalSignals} new signals`);

    return Response.json({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: results.length - successCount,
      total_signals_detected: totalSignals,
      results,
    });

  } catch (error: any) {
    console.error('[signal-detect] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to detect signals' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signals/detect
 *
 * Check signal detection status and history
 */
export async function GET(req: NextRequest) {
  try {
    // Use service role key to bypass RLS
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

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Get recent signal detection activity
    const { data: activity, error } = await supabase
      .from('signal_activity_log')
      .select('*, tracked_accounts(company_name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return Response.json({
      success: true,
      activity: activity || [],
    });

  } catch (error: any) {
    console.error('[signal-detect] GET error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch signal detection history' },
      { status: 500 }
    );
  }
}
