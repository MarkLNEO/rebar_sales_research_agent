# CONVERSATION Mode Performance Issue - Root Cause Analysis

## Problem Statement

Follow-up questions in CONVERSATION mode are taking 50-60+ seconds instead of being fast and conversational. The user observed:

> "it seems that follow up questions are returning MUCH slower now, is that true? Over 60 seconds for a follow up that is supposed to be CONVERSATION mode? hmm... we wanted to have conversation mode specifically so it would be a faster, more realtime experience. I can see that even in followups, the fully system prompt is included along with the additional context..."

## Evidence

**Test Case**: "Tell me more about the CEO" (follow-up to Apple research)
- **TTFB**: 4.9 seconds
- **Total Time**: 58.8 seconds
- **Expected**: < 5 seconds for a simple follow-up

**Console Logs Showed**:
- Web searches being performed for a follow-up question
- Full reasoning sequences executed
- Full system prompt included

## Root Causes Identified

### 1. Web Search Tool Always Enabled
**File**: [app/api/ai/chat/route.ts:227](app/api/ai/chat/route.ts#L227)

```typescript
tools: [{ type: 'web_search' as any }], // Always included!
```

**Problem**: The `web_search` tool is enabled for ALL requests, including follow-ups. The AI agent can choose to do web searches even when answering simple questions from existing context.

**Impact**: Follow-up question "Tell me more about the CEO" triggers web searches instead of using the context from the previous research response.

**Solution**: Conditionally enable web_search based on `research_type`:
```typescript
tools: research_type === 'specific'
  ? [] // No tools for follow-ups - use context only
  : [{ type: 'web_search' as any }], // Full research gets web search
```

---

### 2. Full System Prompt Always Included
**File**: [app/api/ai/chat/route.ts:101-102](app/api/ai/chat/route.ts#L101-L102), [route.ts:214](app/api/ai/chat/route.ts#L214)

```typescript
const modeAdjustedPrompt = addModeInstructions(fullContext.systemPrompt, research_type);
const instructions = fullContext.memoryBlock ? `${modeAdjustedPrompt}\n\n${fullContext.memoryBlock}` : modeAdjustedPrompt;
// ...
instructions, // Full system prompt passed to OpenAI (includes ALL templates, criteria, etc.)
```

**Problem**: Even in "specific" mode (follow-ups), the ENTIRE system prompt is sent:
- All research templates
- All custom criteria definitions
- All signal preferences
- All ICP definitions
- Full research instructions

**Impact**:
- Increases token count significantly
- Forces AI to process irrelevant instructions for simple follow-ups
- Increases reasoning time and TTFB

**Solution**: Create a lightweight conversational prompt for follow-ups:
```typescript
function getInstructionsForMode(fullContext, research_type) {
  if (research_type === 'specific') {
    // Lightweight follow-up prompt
    return `You are a helpful research assistant. Use the conversation history to answer the user's follow-up question concisely and directly.

${fullContext.customTerminology || ''} // Only include custom terms, not full system prompt

## Instructions
- Answer directly using context from previous messages
- Be concise (200-400 words)
- Don't repeat information already provided
- No web searches needed - use existing context`;
  }

  // Full system prompt for TASK mode (deep/quick)
  return addModeInstructions(fullContext.systemPrompt, research_type);
}
```

---

### 3. Conversation History Truncation
**File**: [app/api/ai/chat/route.ts:135](app/api/ai/chat/route.ts#L135)

```typescript
const recentMessages = messages.slice(-6); // Only last 3 exchanges
```

**Problem**: Truncates to last 6 messages (3 exchanges), which might lose important context from the initial research task.

**Impact**: For follow-ups, the AI might not have the full research context, causing it to do web searches to re-gather information.

**Solution**: Adjust history based on mode:
```typescript
const recentMessages = research_type === 'specific'
  ? messages.slice(-10) // Keep more history for follow-ups (5 exchanges)
  : messages.slice(-6);  // Shorter history for new research
```

---

### 4. Research Type Metadata Hardcoded
**File**: [app/api/ai/chat/route.ts:240](app/api/ai/chat/route.ts#L240)

```typescript
research_type: agentType === 'company_research' ? 'deep' : 'standard',
```

**Problem**: This hardcodes metadata to 'deep', ignoring the actual `research_type` parameter from the frontend.

**Impact**: Metadata doesn't reflect actual mode, making analytics/logging incorrect.

**Solution**:
```typescript
research_type: research_type || 'deep', // Use actual mode from frontend
```

---

### 5. Frontend: isFollowUp Flag Not Passed to API
**File**: [src/page-components/ResearchChat.tsx:2166](src/page-components/ResearchChat.tsx#L2166), [ResearchChat.tsx:2194](src/page-components/ResearchChat.tsx#L2194)

```typescript
const isFollowUp = messages.length > 1 && lastUser && !options?.force;
// ...
startMockReasoning(!!isFollowUp); // Only used for mock reasoning UI!
```

**Problem**: The `isFollowUp` detection happens on line 2166, but it's ONLY used for mock reasoning display (line 2194). It's **never passed to the API**.

**Impact**: The API doesn't know if this is a follow-up, so it can't optimize accordingly.

**Current API Payload** (line 2754-2773):
```typescript
const requestPayload = JSON.stringify({
  messages: historyWithCurrent,
  stream: true,
  chatId: chatId ?? currentChatId,
  config: { ... },
  research_type: depth, // Only has 'deep'/'quick'/'specific', not a follow-up flag
  active_subject: activeSubject || null
  // Missing: isFollowUp flag!
});
```

**Solution**: Pass explicit follow-up flag to API:
```typescript
const requestPayload = JSON.stringify({
  messages: historyWithCurrent,
  stream: true,
  chatId: chatId ?? currentChatId,
  config: { ... },
  research_type: depth,
  is_follow_up: isFollowUp, // Add this!
  active_subject: activeSubject || null
});
```

---

### 6. Reasoning Effort Not Optimized for Follow-ups
**File**: [app/api/ai/chat/route.ts:12-25](app/api/ai/chat/route.ts#L12-L25)

```typescript
function getReasoningEffort(
  agentType: string,
  userMessage: string,
  researchType?: 'quick' | 'deep' | 'specific'
): 'low' | 'medium' | 'high' {
  if (researchType === 'deep' && userMessage.length > 500) {
    return 'medium';
  }
  return 'low'; // Everything else is 'low'
}
```

**Problem**: Even 'low' reasoning adds overhead. For simple follow-ups, we could disable reasoning entirely or use a different approach.

**Impact**: Adds 1-3 seconds to TTFB for follow-ups.

**Solution**: Explicitly handle follow-ups:
```typescript
function getReasoningEffort(
  agentType: string,
  userMessage: string,
  researchType?: 'quick' | 'deep' | 'specific',
  isFollowUp?: boolean
): 'low' | 'medium' | 'high' | undefined {
  // For follow-ups: minimal or no reasoning
  if (isFollowUp || researchType === 'specific') {
    return undefined; // Let OpenAI decide (usually fastest)
  }

  if (researchType === 'deep' && userMessage.length > 500) {
    return 'medium';
  }
  return 'low';
}
```

---

## Complete Fix Summary

### Backend Changes ([app/api/ai/chat/route.ts](app/api/ai/chat/route.ts))

1. **Accept `is_follow_up` from frontend**:
```typescript
const {
  messages,
  chatId,
  agentType = 'company_research',
  impersonate_user_id,
  research_type,
  is_follow_up, // Add this
} = body;
```

2. **Disable web search for follow-ups**:
```typescript
tools: (is_follow_up || research_type === 'specific')
  ? []
  : [{ type: 'web_search' as any }],
```

3. **Use lightweight prompt for follow-ups**:
```typescript
const instructions = (is_follow_up || research_type === 'specific')
  ? getLightweightFollowUpPrompt(fullContext)
  : (fullContext.memoryBlock ? `${modeAdjustedPrompt}\n\n${fullContext.memoryBlock}` : modeAdjustedPrompt);
```

4. **Optimize conversation history**:
```typescript
const recentMessages = (is_follow_up || research_type === 'specific')
  ? messages.slice(-10) // More history for context
  : messages.slice(-6);
```

5. **Optimize reasoning effort**:
```typescript
const reasoningEffort = getReasoningEffort(agentType, lastUserMessage.content, research_type, is_follow_up);
```

6. **Fix metadata**:
```typescript
research_type: research_type || 'deep',
```

### Frontend Changes ([src/page-components/ResearchChat.tsx](src/page-components/ResearchChat.tsx))

1. **Pass `is_follow_up` to API** (around line 2754):
```typescript
const requestPayload = JSON.stringify({
  messages: historyWithCurrent,
  stream: true,
  chatId: chatId ?? currentChatId,
  config: {
    ...cfg,
    // ... template config
  },
  research_type: depth,
  is_follow_up: isFollowUp, // Add this!
  active_subject: activeSubject || null
});
```

---

## Expected Performance After Fix

### Before (Current - BROKEN):
- **Follow-up TTFB**: 4-5 seconds
- **Follow-up Total**: 50-60 seconds
- **Behavior**: Web searches, full system prompt, full reasoning

### After (Fixed):
- **Follow-up TTFB**: < 1 second
- **Follow-up Total**: 3-8 seconds
- **Behavior**: No web search, lightweight prompt, minimal reasoning, uses existing context

---

## Testing Plan

1. **Test Scenario**:
   - Research "Apple" (TASK mode - should take 40-60s)
   - Ask "Tell me more about the CEO" (CONVERSATION mode - should take < 8s)

2. **Success Criteria**:
   - ✅ CONVERSATION mode TTFB < 1 second
   - ✅ CONVERSATION mode total < 8 seconds
   - ✅ No web searches in CONVERSATION mode
   - ✅ Response uses context from previous research
   - ✅ Custom terminology still appears in response

3. **Visual Proof**:
   - Console logs showing no web.run calls
   - TTFB metrics showing < 1s
   - Total time < 8s
   - Response content references previous research

---

## Implementation Priority

**CRITICAL** - This breaks the core value proposition of CONVERSATION mode (fast, real-time follow-ups).

**Estimated Fix Time**: 30-45 minutes
**Estimated Testing Time**: 15-20 minutes

---

## Status

❌ **NOT FIXED** - Blocking deployment of CONVERSATION mode feature
