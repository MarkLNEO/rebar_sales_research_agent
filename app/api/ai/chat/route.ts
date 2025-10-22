import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest, checkCredits, deductCredits, logUsage } from '../../lib/auth';
import { buildMemoryBlock } from '../../lib/memory';
import { fetchUserContext, buildSystemPrompt } from '../../lib/context';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Helper: Determine reasoning effort dynamically based on task type
function getReasoningEffort(agentType: string, userMessage: string): 'medium' | 'high' {
  // NEVER use 'low' - minimum is 'medium' for reasoning visibility
  
  // Only use 'high' for extremely complex queries (>300 chars)
  // Medium is sufficient for most research and prevents 14k+ token reasoning overhead
  if (userMessage.length > 300) {
    return 'high';
  }
  
  // Default: medium (enables reasoning visibility while saving tokens)
  // This includes company_research which was previously 'high'
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
        let totalTokens = 0;
        const startTime = Date.now();
        let firstTokenReceived = false;

        try {
          // Send context-appropriate acknowledgment based on agent type and user input
          let initialStatus = 'Starting research...';

          if (agentType === 'settings_agent') {
            initialStatus = 'Reviewing your profile...';
          } else {
            const userInput = lastUserMessage.content.toLowerCase();

            // Check for follow-up patterns
            if (userInput.includes('what about') || userInput.includes('tell me more') ||
                userInput.includes('how about') || messages.length > 2) {
              initialStatus = 'Analyzing your question...';
            }
            // Check for specific research patterns
            else if (userInput.includes('research') || userInput.includes('company') ||
                     userInput.includes('account')) {
              initialStatus = 'Researching company...';
            }
            // Check for contact/people finding
            else if (userInput.includes('contact') || userInput.includes('decision maker') ||
                     userInput.includes('people')) {
              initialStatus = 'Finding contacts...';
            }
            // Check for list/bulk operations
            else if (userInput.includes('list') || userInput.includes('companies that')) {
              initialStatus = 'Analyzing criteria...';
            }
            // Default for ambiguous queries
            else {
              initialStatus = 'Processing your request...';
            }
          }

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
            
            // Explicitly request reasoning content in stream
            include: ['reasoning.encrypted_content'] as any,
            
            // Text formatting with verbosity control
            text: { 
              format: { type: 'text' },
              verbosity: 'medium' as any // Use medium for balanced output (low/medium based on context)
            },
            
            max_output_tokens: 12000, // Reduced from 16000 to prevent excessive token usage
            tools: [{ type: 'web_search' as any }], // Type not yet in SDK, but supported by API
            
            // Enable reasoning summaries (not raw reasoning)
            // gpt-5-mini supports 'detailed' summary which streams reasoning_summary_text.delta events
            reasoning: { 
              effort: reasoningEffort,
              summary: 'detailed' as any // Required to enable reasoning summary streaming
            },
            
            store: true,
            metadata: {
              user_id: user.id,
              chat_id: chatId,
              agent_type: agentType,
              research_type: agentType === 'company_research' ? 'deep' : 'standard',
              reasoning_effort: reasoningEffort // Track for analytics
            }
          });

          let eventCount = 0;
          for await (const event of responseStream as any) {
            eventCount++;

            // Log ALL event types for debugging
            if (event.type) {
              // Log full structure for first 10 events AND for any delta events
              if (eventCount <= 10 || event.type.includes('delta') || event.type.includes('message') || event.type.includes('text')) {
                console.log(`[chat] Event #${eventCount}:`, event.type, JSON.stringify(event, null, 2).substring(0, 500));
              } else if (!event.type.includes('delta')) {
                console.log(`[chat] Event #${eventCount}:`, event.type);
              }
            }
            
            // Send progress on first token (skip for profile coach to reduce noise)
            if (!firstTokenReceived && event.type === 'response.output_text.delta' && agentType !== 'settings_agent') {
              firstTokenReceived = true;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                content: 'Generating report...'
              })}\n\n`));
            }
            
            // Stream reasoning/thinking process - handle all reasoning event variants
            if (event.type === 'response.reasoning.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning',
                content: event.delta
              })}\n\n`));
              continue;
            }

            // Reasoning text deltas (documented in Responses API spec)
            if (event.type === 'response.reasoning_text.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning',
                content: event.delta
              })}\n\n`));
              continue;
            }

            // Reasoning summary text deltas (documented in Responses API spec)
            if (event.type === 'response.reasoning_summary_text.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning',
                content: event.delta
              })}\n\n`));
              continue;
            }

            // Older/alternate Responses API variants for reasoning output
            if (event.type === 'response.thinking.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning',
                content: event.delta
              })}\n\n`));
              continue;
            }

            if (event.type === 'response.reasoning_output_text.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning',
                content: event.delta
              })}\n\n`));
              continue;
            }

            // Stream planning/step progress
            if (event.type === 'response.reasoning_progress' && event.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'reasoning_progress',
                content: event.content
              })}\n\n`));
            }
            
            // Handle reasoning output item - show "thinking" indicator
            if (event.type === 'response.output_item.added' && event.item?.type === 'reasoning') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'thinking',
                content: 'Researching and analyzing...'
              })}\n\n`));
            }

            // Stream content directly - try multiple possible event types
            if (event.type === 'response.output_text.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content: event.delta
              })}\n\n`));
            }

            // Try response.text.delta variant
            if (event.type === 'response.text.delta' && event.delta) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content: event.delta
              })}\n\n`));
            }

            // Try message delta variant
            if (event.type === 'response.message.delta' && event.delta?.content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                content: event.delta.content
              })}\n\n`));
            }

            // Track token usage from response.done event
            if (event.type === 'response.done') {
              totalTokens = event.response?.usage?.total_tokens || 0;

              // If we didn't stream any content, extract it from final response
              if (!firstTokenReceived && event.response?.output) {
                console.log('[chat] No streaming - extracting from final response');
                const textOutput = event.response.output.find((item: any) => item.type === 'message');
                if (textOutput?.content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'content',
                    content: textOutput.content
                  })}\n\n`));
                }
              }
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
