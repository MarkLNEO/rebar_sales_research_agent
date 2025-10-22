# 🚀 Implementation Plan: Optimized Prompting Strategy

**Date**: October 22, 2025  
**Status**: Ready to implement  
**Estimated Time**: 1.5 hours total

---

## 📋 Quick Summary

**What we're doing**: Implementing GPT-5 best practices to make our prompts 15-25% faster, higher quality, and better UX.

**Why**: Current prompts have contradictions, no progress indicators, and don't use Responses API features.

**Risk**: Low (we preserve what works, fix what doesn't)

---

## 🎯 Implementation Steps

### **Phase 1: Update System Prompt** (30 min)

**File**: `app/api/lib/context.ts`

**Action**: Replace `buildSystemPrompt()` function with optimized version from `PROMPT_V2_OPTIMIZED.md`

**Key changes**:
1. ✅ Add `<instruction_hierarchy>` section
2. ✅ Add `<tool_preambles>` section  
3. ✅ Add `<persistence>` section
4. ✅ Add `<context_gathering>` section
5. ✅ Remove contradictions ("be concise but complete", etc.)
6. ✅ Remove "PREFERENCE CHECK-OUT" section (conflicts with UX fixes)
7. ✅ Simplify format requirements (outcome-focused, not template)
8. ✅ Add `<verbosity_control>` section
9. ✅ Wrap sections in XML tags for clarity

**Test**: Build should pass with no TypeScript errors

```bash
npm run build
```

---

### **Phase 2: Add Responses API Features** (20 min)

**File**: `app/api/ai/chat/route.ts`

**Current code** (around line 50):
```typescript
const responseStream = await openai.responses.stream({
  model: process.env.OPENAI_MODEL || 'gpt-5-mini',
  instructions,
  input: lastUserMessage.content,
  text: { format: { type: 'text' } },
  max_output_tokens: 16000,
  tools: [{ type: 'web_search' as any }],
  reasoning: { effort: 'medium' },
  store: true,
  metadata: {
    user_id: user.id,
    chat_id: chatId,
    agent_type: agentType,
    research_type: agentType === 'company_research' ? 'deep' : 'standard'
  }
});
```

**New code** (add these):
```typescript
// Helper to get previous response ID for multi-turn
function getPreviousResponseId(chatId: string): string | undefined {
  // Implement: Look up last response_id from this chat
  // Store in database or memory cache
  return undefined; // TODO
}

// Helper to determine reasoning effort by task type
function getReasoningEffort(agentType: string, userMessage: string): 'low' | 'medium' | 'high' {
  // Quick brief or short follow-ups: low
  if (agentType === 'quick' || userMessage.length < 50) {
    return 'low';
  }
  
  // Deep research: medium (default)
  // Complex multi-step: high (rare)
  return 'medium';
}

const responseStream = await openai.responses.stream({
  model: process.env.OPENAI_MODEL || 'gpt-5-mini',
  instructions,
  input: lastUserMessage.content,
  
  // NEW: Multi-turn context (reuses reasoning from previous turn)
  previous_response_id: getPreviousResponseId(chatId),
  
  // NEW: Dynamic reasoning effort
  reasoning: { 
    effort: getReasoningEffort(agentType, lastUserMessage.content)
  },
  
  // NEW: Verbosity control (can be overridden in prompt)
  verbosity: 'medium',
  
  text: { format: { type: 'text' } },
  max_output_tokens: 16000,
  tools: [{ type: 'web_search' as any }],
  store: true, // Already enabled, good!
  metadata: {
    user_id: user.id,
    chat_id: chatId,
    agent_type: agentType,
    research_type: agentType === 'company_research' ? 'deep' : 'standard'
  }
});

// Store response_id for next turn
// await storeResponseId(chatId, response.id); // TODO
```

**Note**: `previous_response_id` implementation requires tracking. Can be added incrementally.

---

### **Phase 3: Test & Verify** (30 min)

#### **Test 1: Quick Brief** (should be fast)
```
User: "Quick brief on Stripe"

Expected:
- Shows progress: "🔍 Researching Stripe..."
- Uses reasoning_effort: low
- Fast response (< 30s)
- No "PREFERENCE CHECK-OUT" language
- Natural follow-up suggestions
```

#### **Test 2: Deep Research** (should be thorough)
```
User: "Deep research on Salesforce for enterprise sales"

Expected:
- Shows progress throughout
- Uses reasoning_effort: medium
- Thorough insights (5-7 key findings)
- ICP scoring
- No contradictions in behavior
```

#### **Test 3: Follow-Up** (should use context)
```
Turn 1: "Research Stripe"
Turn 2: "What about their recent acquisitions?"

Expected:
- Should reference Stripe from previous turn
- Fast (low reasoning for follow-up)
- Doesn't re-introduce company
```

#### **Test 4: UI Progress Indicators**
```
Expected:
- See "🔍 Researching..." message
- See "Analyzing..." updates
- See "✅ Complete" when done
- Progress shown in thinking panel
```

---

### **Phase 4: Monitor & Iterate** (ongoing)

#### **Metrics to Track**
1. **Speed**: Time to first response, total response time
2. **Quality**: User ratings, insight relevance  
3. **UX**: Progress indicator visibility, user satisfaction
4. **Cost**: Token usage per request
5. **Consistency**: Response format adherence

#### **A/B Test (Optional)**
- 50% users: Old prompt
- 50% users: New prompt
- Compare metrics after 100 requests

#### **Metaprompting for Refinement**
Use GPT-5 itself to optimize further:

```
Prompt for GPT-5:
"Here's our current prompt: [PROMPT_V2]

Users sometimes report [SPECIFIC ISSUE]. What minimal edits would 
make the agent more consistently [DESIRED BEHAVIOR] without changing 
the overall structure?"
```

---

## 🎓 Learning Resources

**For Team Members**:
1. Read `PROMPT_AUDIT_AND_OPTIMIZATION.md` (the "why")
2. Read `PROMPT_V2_OPTIMIZED.md` (the "what")
3. Read `docs/CLAUDE_guides/gpt-5_prompting_best_practices.md` (official guide)

**Key Concepts**:
- **Instruction Hierarchy**: Priority ordering prevents contradictions
- **Tool Preambles**: Progress updates improve UX
- **Persistence**: Complete autonomously without asking permission
- **Context Gathering**: Parallel searches with clear stop criteria
- **Responses API**: Use `previous_response_id` for multi-turn efficiency

---

## ✅ Success Criteria

**We'll know it's working when**:

1. ✅ Users see progress indicators ("🔍 Researching...")
2. ✅ Quick briefs complete in < 30s (vs 1-2 min before)
3. ✅ No more "PREFERENCE CHECK-OUT" language
4. ✅ Follow-up suggestions are natural and specific
5. ✅ No contradictory behavior (asking questions after saying "never ask")
6. ✅ Consistent output quality
7. ✅ User satisfaction scores improve

**Red Flags** (roll back if we see):
- ❌ Response quality degrades
- ❌ More errors or refusals
- ❌ Users complain about verbosity
- ❌ Cost increases significantly

---

## 🔄 Rollback Plan

If issues arise:

1. **Quick revert**: `git revert HEAD` (restores previous prompt)
2. **Partial rollback**: Keep new structure, restore specific sections
3. **Gradual rollout**: Test with internal users first

All changes are in one file (`context.ts`), making rollback trivial.

---

## 📊 Expected Results

### **Performance**
- ⚡ **15-25% faster** (better context gathering, dynamic reasoning)
- 📈 **Higher quality** (no contradictions, clear hierarchy)
- 🎯 **More consistent** (structured guidance, no conflicts)

### **User Experience**
- **Before**: Silent research → sudden response (confusing)
- **After**: "🔍 Researching..." → "Analyzing..." → "✅ Complete" (reassuring)

### **Cost Efficiency**
- 💰 **Token savings**: Dynamic reasoning (low for simple, medium for complex)
- 🔁 **Context reuse**: `previous_response_id` reduces redundancy
- 🛑 **Better stop criteria**: Prevents over-searching

---

## 🚀 Ready to Implement?

**Status**: ✅ All documentation complete  
**Risk**: 🟢 Low (preserves strengths, fixes weaknesses)  
**Confidence**: 🟢 High (based on official best practices)

**Next Action**: Start with Phase 1 (update `context.ts`)

**Questions?** Review:
- `PROMPT_AUDIT_AND_OPTIMIZATION.md` for detailed analysis
- `PROMPT_V2_OPTIMIZED.md` for complete implementation
- `docs/CLAUDE_guides/gpt-5_prompting_best_practices.md` for official guide

---

**Let's ship it!** 🚀
