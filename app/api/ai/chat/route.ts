import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest, checkCredits, deductCredits, logUsage } from '../../lib/auth';
import { loadFullUserContext } from '../../lib/contextLoader';

export const runtime = 'nodejs';
export const maxDuration = 300;

// Helper: Determine reasoning effort dynamically based on task type and research mode
// Per OpenAI GPT-5 best practices: "Many workflows can be accomplished with consistent
// results at medium or even low reasoning_effort" - prioritize latency over exhaustive reasoning
function getReasoningEffort(
  agentType: string,
  userMessage: string,
  researchType?: 'quick' | 'deep' | 'specific'
): 'low' | 'medium' | 'high' {
  // Deep mode with very complex queries: use medium reasoning (not high - too slow)
  if (researchType === 'deep' && userMessage.length > 500) {
    return 'medium';
  }

  // Default: LOW reasoning for fast TTFB and good results
  // This significantly reduces planning overhead while maintaining quality
  return 'low';
}

// Helper: Add mode-specific instructions to prompt
function addModeInstructions(basePrompt: string, researchType?: 'quick' | 'deep' | 'specific'): string {
  if (!researchType || researchType === 'deep') {
    return basePrompt; // Deep is the default, no modifications needed
  }

  if (researchType === 'quick') {
    const quickInstructions = `\n\n## QUICK BRIEF MODE ACTIVE

You are in Quick Brief mode. The user needs a concise, scannable brief they can review in 60-90 seconds before a call.

**Output Requirements:**
- **Length:** 400-600 words maximum
- **Structure:** 3-5 key sections only
- **Bullet points:** Preferred over paragraphs
- **Speed:** Prioritize time-to-first-byte; reduce web searches to 2-3 max

**Required Sections:**
1. **Executive Summary** (2-3 sentences)
2. **Why Now** (2-3 recent signals with dates)
3. **Key Decision Maker** (1-2 contacts with roles)
4. **Next Step** (One specific action)

**Omit:** Lengthy background, multiple decision makers, detailed source lists. This is a sprint, not a marathon.`;

    return basePrompt + quickInstructions;
  }

  if (researchType === 'specific') {
    const specificInstructions = `\n\n## SPECIFIC/FOLLOW-UP MODE ACTIVE

This is a follow-up question or specific query. The user wants a focused answer, not a full research brief.

**Output Requirements:**
- **Direct answer first:** Lead with the specific information requested
- **Concise:** 200-400 words unless more detail explicitly requested
- **Context-aware:** Reference previous research if available
- **No boilerplate:** Skip standard brief structure unless it directly answers the question

Example: If asked "What's their tech stack?", list the stack immediately, then add brief context if relevant.`;

    return basePrompt + specificInstructions;
  }

  return basePrompt;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers.get('authorization');
    const body = await req.json();
    const {
      messages,
      chatId,
      agentType = 'company_research',
      impersonate_user_id,
      research_type, // Extract mode selection from frontend
    } = body;

    // Authenticate and check credits in PARALLEL
    const [{ user, supabase }, creditStatus] = await Promise.all([
      authenticateRequest(authHeader, impersonate_user_id),
      (async () => {
        const { user: tempUser, supabase: tempSupabase } = await authenticateRequest(authHeader, impersonate_user_id);
        return checkCredits(tempSupabase, tempUser.id);
      })(),
    ]);

    // Load complete user context with caching (replaces 7-9 sequential queries with 1 cached lookup)
    const fullContext = await loadFullUserContext(supabase, user.id, agentType);

    // Apply mode-specific instructions based on research_type
    const modeAdjustedPrompt = addModeInstructions(fullContext.systemPrompt, research_type);
    const instructions = fullContext.memoryBlock ? `${modeAdjustedPrompt}\n\n${fullContext.memoryBlock}` : modeAdjustedPrompt;

    console.log('[chat] Research mode:', research_type || 'default (deep)', '| Agent type:', agentType);

    // Debug: Check if CLARIFY instructions are in the prompt
    const hasClarifyInstructions = instructions.includes('[CLARIFY]');
    console.log('[chat] System prompt includes [CLARIFY] instructions:', hasClarifyInstructions);
    if (hasClarifyInstructions) {
      const clarifySection = instructions.match(/## Entity Disambiguation[\s\S]{0,500}/)?.[0];
      console.log('[chat] CLARIFY section preview:', clarifySection?.substring(0, 200));
    }

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

          // Determine optimal reasoning effort for this request (considering research mode)
          const reasoningEffort = getReasoningEffort(agentType, lastUserMessage.content, research_type);
          console.log('[chat] Using reasoning effort:', reasoningEffort, 'for agentType:', agentType, 'mode:', research_type);

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

            // Use LOW reasoning effort by default per OpenAI best practices for fast TTFB
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

            // Handle web search tool use events
            if (event.type === 'response.tool_use.started' && event.tool_use?.type === 'web_search') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'web_search',
                query: event.tool_use?.query || 'Searching...'
              })}\n\n`));
            }

            if (event.type === 'response.tool_use.completed' && event.tool_use?.type === 'web_search') {
              const sources = event.tool_use?.result?.results?.map((r: any) => r.url) || [];
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'web_search',
                query: event.tool_use?.query || 'Search completed',
                sources: sources.slice(0, 8) // Limit to 8 sources for UI
              })}\n\n`));
            }

            // Handle generic web search events (if API uses different naming)
            if (event.type === 'response.web_search.started') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'web_search',
                query: event.query || 'Searching the web...'
              })}\n\n`));
            }

            if (event.type === 'response.web_search.completed') {
              const sources = event.results?.map((r: any) => r.url) || [];
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'web_search',
                query: event.query || 'Search completed',
                sources: sources.slice(0, 8)
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
