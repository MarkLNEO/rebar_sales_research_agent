# 🎯 Context-Aware Prompting Fix

## Problem Identified

User loaded Profile Coach and received a **massive, irrelevant response** about LinkedIn profile completion, email signatures, and 30/60/90 day plans - completely wrong context.

### Root Causes

1. **Generic User Message**: "Please help me complete my profile setup" was too vague
2. **Weak Prompt Constraints**: "Keep responses under 4 lines" was easily ignored by AI
3. **No Context Awareness**: Prompt didn't know what was already filled vs missing
4. **Wrong Mental Model**: AI thought "profile" = LinkedIn profile, not ICP research profile

## Solution Implemented

### 1. Ultra-Specific SettingsAgent Prompt

**File**: `src/services/agents/ResearchAgent.ts`

**Before**:
```typescript
return `You are a precision ICP configuration specialist...
<verbosity>
Keep responses under 4 lines.
One question at a time.
</verbosity>`;
```

**After**:
```typescript
return `You are an ICP Setup Coach helping ${profile?.company_name || 'the user'} 
define their ideal customer profile for B2B research.

## YOUR ROLE
Help the user complete their research profile (NOT a personal LinkedIn profile). 
This profile tells the system WHAT companies to research and HOW to evaluate them.

## CURRENT STATUS
Company: ${profile?.company_name || '❌ Not set'}
Industry: ${profile?.industry || '❌ Not set'}
ICP: ${profile?.icp_definition ? '✓ Set' : '❌ Not set'}
Custom Criteria: ${customCriteria.length} defined
Buying Signals: ${signals.length} tracked

${missing.length > 0 ? `## MISSING: ${missing.join(', ')}` : '## PROFILE COMPLETE ✓'}

## CRITICAL RULES
1. **MAX 3 SENTENCES** per response (this is not negotiable)
2. **ONE QUESTION** at a time
3. **NO LISTS** longer than 3 items
4. **NO TEMPLATES** or boilerplate text
5. **FOCUS**: Help with ICP/research setup, NOT personal profiles

## RESPONSE FORMAT
[1 sentence acknowledging their input]
[1 sentence asking next question OR confirming save]
[Optional: 1 sentence with example]

## EXAMPLES OF GOOD RESPONSES
"Got it - you're targeting enterprise cybersecurity companies. What's the minimum company size you care about (employees or revenue)?"

"Perfect. I'll save 'Has CISO' and 'SOC2 certified' as critical criteria. Want to add signals like 'recent breach' or 'compliance deadline'?"

**REMEMBER**: You are helping with RESEARCH PROFILE setup (what companies to find), NOT personal LinkedIn profiles. Stay focused and concise.`;
```

### 2. Context-Specific Initial Message

**File**: `src/pages/CompanyProfile.tsx`

**Before**:
```typescript
conversationHistory.push({
  role: 'user',
  content: 'Please help me complete my profile setup.'
});
```

**After**:
```typescript
const contextMessage = (() => {
  // Check what's missing and ask specifically
  if (!profileData?.icp_definition) {
    return "Help me define my ICP for B2B research.";
  }
  if (customCriteriaCount === 0) {
    return "Help me add custom criteria to qualify companies.";
  }
  if (signalPreferencesCount === 0) {
    return "Help me set up buying signals to track.";
  }
  return "Help me review and improve my research profile.";
})();

conversationHistory.push({
  role: 'user',
  content: contextMessage
});
```

## Key Improvements

### 1. **Explicit Context Setting**
- Shows current status (what's filled, what's missing)
- Identifies specific gaps to address
- Prevents AI from guessing wrong context

### 2. **Strict Constraints**
- "MAX 3 SENTENCES (this is not negotiable)" - stronger than "keep it short"
- "NO TEMPLATES or boilerplate text" - explicit ban on long lists
- "ONE QUESTION at a time" - prevents overwhelming responses

### 3. **Mental Model Clarity**
- "NOT a personal LinkedIn profile" - explicitly corrects misconception
- "This profile tells the system WHAT companies to research" - clarifies purpose
- Examples show exact format expected

### 4. **Dynamic User Message**
- Changes based on what's missing
- Specific task instead of generic "help me"
- Guides AI to right starting point

## Expected Behavior Now

### Scenario 1: Missing ICP Definition
**User opens Profile Coach**

**AI Response**:
```
I see you haven't defined your ICP yet. Who is your ideal customer in one sentence? 
For example: "Enterprise cybersecurity companies with 500+ employees and a CISO."
```

### Scenario 2: Missing Custom Criteria
**User opens Profile Coach**

**AI Response**:
```
Your ICP is set for enterprise cybersecurity. What specific data points qualify a company for you? 
For example: "Has CISO", "SOC2 certified", "50M+ revenue".
```

### Scenario 3: Profile Complete
**User opens Profile Coach**

**AI Response**:
```
Your profile looks complete! You're targeting enterprise cybersecurity companies with 3 criteria and 5 signals. 
Want to review or adjust anything?
```

## Testing

### Before Fix
```
User: [Opens Profile Coach]
AI: [Generates 500+ word LinkedIn profile template with headlines, bios, 
     email signatures, 30/60/90 day plans, outreach templates, etc.]
```

### After Fix
```
User: [Opens Profile Coach]
AI: "I see you haven't defined your ICP yet. Who is your ideal customer 
     in one sentence? For example: 'Enterprise cybersecurity companies 
     with 500+ employees and a CISO.'"
```

## Principles Applied

### 1. **Context is King**
Every interaction should know:
- Where the user is (Profile Coach, not LinkedIn)
- What they've done (ICP set, criteria defined)
- What's missing (signals not configured)
- What they need next (specific gap to fill)

### 2. **Constraints Must Be Explicit**
Weak: "Keep it short"
Strong: "MAX 3 SENTENCES (this is not negotiable)"

### 3. **Examples > Instructions**
Show exactly what good looks like:
```
## EXAMPLES OF GOOD RESPONSES
"Got it - you're targeting enterprise cybersecurity companies..."
```

### 4. **Prevent Misunderstandings**
Explicitly state what NOT to do:
- "NOT a personal LinkedIn profile"
- "NO TEMPLATES or boilerplate text"
- "NO LISTS longer than 3 items"

### 5. **Dynamic Adaptation**
Prompt changes based on state:
- Missing ICP → Ask about ICP
- Missing criteria → Ask about criteria
- Complete → Offer review

## Impact

### Before
- ❌ 500+ word irrelevant responses
- ❌ User confusion ("Why is it asking about LinkedIn?")
- ❌ Wasted tokens and time
- ❌ Poor UX, frustration

### After
- ✅ 2-3 sentence focused responses
- ✅ Clear, relevant guidance
- ✅ Efficient token usage
- ✅ Smooth, helpful UX

## Lessons for Other Agents

### Apply These Principles to ALL Agent Interactions

1. **Show Current State**
   ```
   ## CURRENT STATUS
   Research: 15 companies analyzed
   Tracked: 8 accounts
   Signals: 3 new this week
   ```

2. **Be Explicit About Context**
   ```
   You are helping with [SPECIFIC TASK], NOT [COMMON CONFUSION].
   ```

3. **Use Strong Constraints**
   ```
   1. MAX 3 SENTENCES (non-negotiable)
   2. ONE question at a time
   3. NO lists > 3 items
   ```

4. **Provide Examples**
   ```
   ## GOOD RESPONSE
   "Got it - you're researching Acme Corp. Want me to focus on their tech stack or recent news?"
   
   ## BAD RESPONSE
   [Don't show 20-item checklist]
   ```

5. **Dynamic Initial Messages**
   ```typescript
   const message = userHasResearched 
     ? "Continue researching or start new?"
     : "What company should I research first?";
   ```

## Status

✅ **FIXED** - Profile Coach now provides concise, context-aware responses

The AI will now:
- Respond in 2-3 sentences max
- Focus on ICP/research setup (not LinkedIn)
- Ask one question at a time
- Adapt to what's missing in the profile
- Provide relevant examples

**Test it**: Open Profile Coach and verify responses are short, focused, and relevant.
