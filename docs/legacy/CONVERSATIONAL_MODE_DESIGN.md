# Conversational Mode Design

## Problem Statement

Users want two different interaction modes:
1. **Research Mode**: "Research Gartner" → Full context, deep analysis, comprehensive output
2. **Conversational Mode**: "tell me about their CEO" → Quick, natural, context-aware follow-ups

Currently, every message triggers full context loading, heavy prompts, and research-mode thinking.

## Solution Architecture

### 1. Mode Detection Logic

Detect conversational mode when:
- ✅ Message history exists (messages.length > 2)
- ✅ Last assistant message was research output (contained company name or significant content)
- ✅ User message is a follow-up pattern ("tell me", "what about", "how about", question marks)
- ✅ User message does NOT contain new company names or research triggers

```typescript
function detectInteractionMode(messages: any[], currentMessage: string): 'research' | 'conversational' {
  // First message is always research mode
  if (messages.length <= 1) return 'research';

  const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();

  // If no previous research, must be research mode
  if (!lastAssistantMsg || lastAssistantMsg.content.length < 200) {
    return 'research';
  }

  const userMsg = currentMessage.toLowerCase();

  // New company research triggers
  const researchPatterns = [
    /^research\s+[\w\s]+/i,
    /^tell me about\s+[\w\s]+(?:company|corp|inc)/i,
    /^analyze\s+[\w\s]+/i,
    /^deep dive\s+on\s+[\w\s]+/i,
  ];

  if (researchPatterns.some(pattern => pattern.test(userMsg))) {
    return 'research';
  }

  // Follow-up patterns
  const conversationalPatterns = [
    'tell me more',
    'what about',
    'how about',
    'and their',
    'what\'s their',
    'who is',
    'why did',
    'when did',
    '?', // Questions are usually follow-ups
  ];

  if (conversationalPatterns.some(pattern => userMsg.includes(pattern))) {
    return 'conversational';
  }

  // If message is short and previous response was long, likely follow-up
  if (currentMessage.length < 100 && lastAssistantMsg.content.length > 500) {
    return 'conversational';
  }

  // Default to research for safety
  return 'research';
}
```

### 2. Lightweight Conversational Prompt

Instead of 3000+ token research prompt, use minimal conversational prompt:

```typescript
function buildConversationalPrompt(userName?: string): string {
  return `You are a B2B research assistant having a conversation with ${userName || 'the user'}.

**Context**: The user just received research about a company. Now they're asking follow-up questions.

**Your Role**:
- Answer naturally and conversationally
- Reference previous research in the conversation history
- Be concise but thorough (200-400 words unless more needed)
- Use web_search tool ONLY if conversation history lacks the answer
- Lead with the direct answer, then add context if helpful

**Important**:
- Don't repeat information already provided
- Don't restart with company overviews
- Maintain the helpful, professional tone
- If user asks about a new topic the previous research didn't cover, use web_search

**CRITICAL**: When answering follow-up questions about details (CEO, tech stack, funding, etc.),
include a [SAVE_PREF] block to offer saving this as a future preference. See examples in your training.`;
}
```

### 3. Context Loading Optimization

```typescript
// Current: Always loads full context
const fullContext = await loadFullUserContext(supabase, user.id, agentType);

// New: Conditional loading
let systemPrompt: string;
let contextLoaded: boolean;

const mode = detectInteractionMode(messages, lastUserMessage.content);

if (mode === 'conversational') {
  // Lightweight prompt, skip ICP/signals loading
  systemPrompt = buildConversationalPrompt(fullContext.profile?.user_name);
  contextLoaded = false;
  console.log('[chat] Using conversational mode - lightweight context');
} else {
  // Full research context
  const fullContext = await loadFullUserContext(supabase, user.id, agentType);
  systemPrompt = addModeInstructions(fullContext.systemPrompt, research_type);
  contextLoaded = true;
  console.log('[chat] Using research mode - full context');
}
```

### 4. Model Configuration Tuning

```typescript
// Research mode
reasoning: {
  effort: 'low', // Already optimized
}

// Conversational mode (even lighter)
reasoning: {
  effort: 'low',
  type: 'natural', // More conversational, less structured
}

// Or consider using a faster model for pure conversation
model: mode === 'conversational' ? 'gpt-4o' : 'gpt-5-mini'
```

### 5. Token Budget Optimization

```typescript
// Research mode
max_output_tokens: 12000

// Conversational mode
max_output_tokens: 4000 // Faster, more focused
```

## Benefits

### For Users
✅ **Natural flow** - Feels like chatting, not submitting forms
✅ **Instant responses** - No loading heavy context every time
✅ **Contextual** - Agent remembers the conversation
✅ **Efficient** - Don't pay for unnecessary context loading

### For Product
✅ **Lower costs** - Skip context loading on follow-ups
✅ **Faster TTFB** - Smaller prompts, lower reasoning
✅ **Better UX** - Mode matches user intent
✅ **Scalable** - Reduces DB queries per interaction

## Backward Compatibility

- ✅ First messages still work identically (research mode)
- ✅ Explicit research requests still trigger full context
- ✅ Settings agent unchanged (already has custom prompt)
- ✅ No frontend changes required (transparent to UI)
- ✅ No breaking changes to API contract

## Fallback Strategy

If conversational mode lacks information:
1. Assistant includes disclaimer: "I don't see this in our previous research. Let me search..."
2. Uses web_search tool to fill gap
3. Or: Falls back to research mode if user query indicates new direction

## Example Flow

### Before (Current)
```
User: "Research Gartner"
→ Load: ICP, signals, preferences, disqualifiers, term mappings (7 queries)
→ Prompt: 3500 tokens
→ Response: 2000 tokens
→ Time: 8 seconds

User: "tell me about their CEO"
→ Load: ICP, signals, preferences, disqualifiers, term mappings (7 queries) ❌ UNNECESSARY
→ Prompt: 3500 tokens ❌ OVERKILL
→ Response: 500 tokens
→ Time: 6 seconds ❌ TOO SLOW

User: "what about their tech stack?"
→ Load: ICP, signals, preferences, disqualifiers, term mappings (7 queries) ❌ UNNECESSARY
→ Prompt: 3500 tokens ❌ OVERKILL
→ Response: 500 tokens
→ Time: 6 seconds ❌ TOO SLOW
```

### After (With Conversational Mode)
```
User: "Research Gartner"
→ Mode: RESEARCH
→ Load: Full context (cached)
→ Prompt: 3500 tokens
→ Response: 2000 tokens
→ Time: 8 seconds

User: "tell me about their CEO"
→ Mode: CONVERSATIONAL ✨
→ Load: None (uses conversation history)
→ Prompt: 300 tokens ✅ LIGHTWEIGHT
→ Response: 500 tokens
→ Time: 2-3 seconds ✅ FAST

User: "what about their tech stack?"
→ Mode: CONVERSATIONAL ✨
→ Load: None (uses conversation history)
→ Prompt: 300 tokens ✅ LIGHTWEIGHT
→ Response: 500 tokens
→ Time: 2-3 seconds ✅ FAST
```

## Implementation Phases

### Phase 1: Mode Detection ✅ (Quick win)
- Add `detectInteractionMode()` function
- Log mode for monitoring
- No behavior changes yet

### Phase 2: Lightweight Prompt (Medium)
- Add `buildConversationalPrompt()`
- Use based on mode detection
- Test that conversation history provides sufficient context

### Phase 3: Context Optimization (High impact)
- Skip full context loading in conversational mode
- Monitor for any context gaps
- Add fallbacks if needed

### Phase 4: Model Tuning (Polish)
- Adjust reasoning effort
- Consider faster model for conversation
- Optimize token budgets

## Metrics to Track

1. **Mode Distribution**
   - % messages in research mode vs conversational mode
   - Average conversation length before mode switch

2. **Performance**
   - TTFB: Research vs conversational
   - Token usage: Research vs conversational
   - DB queries: Research vs conversational

3. **Quality**
   - User satisfaction (follow-up engagement)
   - Fallback rate (when conversation lacks context)
   - Error rate by mode

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Conversation history lacks info | Allow web_search in conversational mode |
| Mode detection false positive | Conservative detection, default to research |
| User expects full research | Clear indicator in UI when in conversational mode |
| Preference learning breaks | Keep [SAVE_PREF] in conversational prompt |

## Success Criteria

✅ Follow-up messages respond in <3 seconds (vs 6+ seconds now)
✅ No increase in user complaints about missing information
✅ 50%+ of messages after initial research use conversational mode
✅ Conversation engagement increases (more back-and-forth)
✅ Cost per conversation decreases due to fewer DB queries

---

## Next Steps

1. Implement `detectInteractionMode()` with logging only (no behavior change)
2. Add `buildConversationalPrompt()` and A/B test with small percentage
3. Monitor metrics for 1 week
4. Roll out to 100% if metrics positive
5. Add Phase 3 (context optimization) for additional wins
