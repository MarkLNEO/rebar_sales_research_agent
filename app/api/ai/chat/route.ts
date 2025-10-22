import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest, checkCredits, deductCredits, logUsage } from '../../lib/auth';
import { buildMemoryBlock } from '../../lib/memory';
import { fetchUserContext, buildSystemPrompt } from '../../lib/context';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const { messages, chatId, agentType = 'company_research', impersonate_user_id } = body;

    // Authenticate
    const { user, supabase } = await authenticateRequest(authHeader, impersonate_user_id);
    
    // Check credits
    const creditStatus = await checkCredits(supabase, user.id);
    
    // Fetch context
    const userContext = await fetchUserContext(supabase, user.id);
    const memoryBlock = await buildMemoryBlock(user.id, agentType);
    
    // Build system prompt (now async to fetch learned preferences)
    const systemPrompt = await buildSystemPrompt(userContext, agentType);
    const instructions = memoryBlock ? `${systemPrompt}\n\n${memoryBlock}` : systemPrompt;

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
      // Note: project parameter removed - was causing "mismatched_project" errors
    });

    // Get last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    if (!lastUserMessage) {
      console.error('[chat] No user message found in messages:', JSON.stringify(messages));
      return new Response(JSON.stringify({ error: 'No user message found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[chat] Starting stream for user:', user.id, 'chatId:', chatId, 'agentType:', agentType);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[chat] Calling OpenAI Responses API...');
          const responseStream = await openai.responses.stream({
            model: process.env.OPENAI_MODEL || 'gpt-5-mini',
            instructions,
            input: lastUserMessage.content,
            text: { format: { type: 'text' } },
            max_output_tokens: 16000,
            tools: [{ type: 'web_search' as any }], // Type not yet in SDK, but supported by API
            reasoning: { effort: 'medium' },
            store: true,
            metadata: {
              user_id: user.id,
              chat_id: chatId,
              agent_type: agentType,
              research_type: agentType === 'company_research' ? 'deep' : 'standard'
            }
          });

          let totalTokens = 0;
          const startTime = Date.now();

          for await (const event of responseStream as any) {
            // Transform OpenAI Responses API events to frontend-compatible format
            if (event.type === 'response.output_text.delta' && event.delta) {
              // Frontend expects type: 'content' with content field
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content: event.delta
              })}\n\n`));
            }

            // Track token usage from response.done event
            if (event.type === 'response.done') {
              totalTokens = event.response?.usage?.total_tokens || 0;
            }
          }

          // Log usage and deduct credits
          if (totalTokens > 0) {
            await Promise.all([
              logUsage(supabase, user.id, 'chat', totalTokens, { chatId, agentType }),
              deductCredits(supabase, user.id, totalTokens)
            ]);
          }

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done',
            tokens: totalTokens,
            duration_ms: Date.now() - startTime
          })}\n\n`));

          controller.close();
        } catch (error: any) {
          console.error('[chat] stream error:', error);
          console.error('[chat] error details:', {
            message: error.message,
            status: error.status,
            type: error.type,
            code: error.code
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error.message || 'Stream failed'
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (error: any) {
    console.error('[chat] error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('authorization') ? 401 : 
             error.message.includes('restricted') ? 403 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
