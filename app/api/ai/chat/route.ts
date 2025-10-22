import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest, checkCredits, deductCredits, logUsage } from '../../lib/auth';
import { buildMemoryBlock } from '../../lib/memory';
import { fetchUserContext, buildSystemPrompt } from '../../lib/context';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Helper: Determine reasoning effort dynamically based on task type
function getReasoningEffort(agentType: string, userMessage: string): 'low' | 'medium' | 'high' {
  // Quick brief or short follow-ups: low
  if (agentType === 'quick') {
    return 'low';
  }
  
  // Very short questions (< 50 chars) likely follow-ups: low
  if (userMessage.length < 50) {
    return 'low';
  }
  
  // Deep research: medium (default, balances quality and speed)
  // Complex multi-step tasks: high (rare, only when explicitly needed)
  return 'medium';
}

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
          // Send context-appropriate acknowledgment
          const initialStatus = agentType === 'settings_agent' 
            ? 'Reviewing your profile...'
            : 'Starting research...';
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            content: initialStatus
          })}\n\n`));

          console.log('[chat] Calling OpenAI Responses API...');

          // Determine optimal reasoning effort for this request
          const reasoningEffort = getReasoningEffort(agentType, lastUserMessage.content);
          console.log('[chat] Using reasoning effort:', reasoningEffort, 'for agentType:', agentType);

          const responseStream = await openai.responses.stream({
            model: process.env.OPENAI_MODEL || 'gpt-5-mini',
            instructions,
            input: lastUserMessage.content,
            
            // Text formatting with verbosity control
            text: { 
              format: { type: 'text' },
              verbosity: 'medium' as any // Nested under text per API docs
            },
            
            max_output_tokens: 16000,
            tools: [{ type: 'web_search' as any }], // Type not yet in SDK, but supported by API
            
            // Dynamic reasoning effort (saves tokens on simple tasks)
            reasoning: { effort: reasoningEffort },
            
            store: true,
            metadata: {
              user_id: user.id,
              chat_id: chatId,
              agent_type: agentType,
              research_type: agentType === 'company_research' ? 'deep' : 'standard',
              reasoning_effort: reasoningEffort // Track for analytics
            }
          });

          let totalTokens = 0;
          const startTime = Date.now();
          let firstTokenReceived = false;
          let contentBuffer = ''; // Buffer to detect planning checklist
          let planningExtracted = false;

          for await (const event of responseStream as any) {
            // Send progress on first token (skip for profile coach to reduce noise)
            if (!firstTokenReceived && event.type === 'response.output_text.delta' && agentType !== 'settings_agent') {
              firstTokenReceived = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                content: 'Generating report...'
              })}\n\n`));
            }
            
            // Stream reasoning/thinking process
            if (event.type === 'response.reasoning.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning',
                content: event.delta
              })}\n\n`));
            }
            
            // Stream planning/step progress
            if (event.type === 'response.reasoning_progress' && event.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning_progress',
                content: event.content
              })}\n\n`));
            }
            
            // Transform OpenAI Responses API events to frontend-compatible format
            if (event.type === 'response.output_text.delta' && event.delta) {
              // Buffer content to detect planning checklist
              contentBuffer += event.delta;
              
              // Try to extract planning checklist from beginning of response
              if (!planningExtracted && contentBuffer.length > 50) {
                const planMatch = contentBuffer.match(/🎯\s*(?:Research\s+)?Plan:?\s*\n([\s\S]{20,500}?)\n\n/);
                if (planMatch) {
                  planningExtracted = true;
                  const planContent = planMatch[0].trim();
                  
                  // Send planning as reasoning_progress event
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'reasoning_progress',
                    content: planContent
                  })}\n\n`));
                  
                  // Continue with content after the plan
                  const afterPlan = contentBuffer.substring(planMatch.index! + planMatch[0].length);
                  if (afterPlan) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      content: afterPlan
                    })}\n\n`));
                  }
                  contentBuffer = ''; // Clear buffer
                  continue;
                }
              }
              
              // If no planning detected yet and buffer is large, start sending content
              if (!planningExtracted && contentBuffer.length > 800) {
                planningExtracted = true; // Stop looking
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: contentBuffer
                })}\n\n`));
                contentBuffer = '';
              } else if (planningExtracted) {
                // Already extracted or not present, stream content normally
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: event.delta
                })}\n\n`));
              }
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
