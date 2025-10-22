# 🎯 Complete 10/10 Implementation Plan

**Goal**: Achieve perfect 10/10 alignment across all UAT requirements  
**Current Status**: 8.5/10 (85% compliant)  
**Target**: 10/10 (100% compliant)

---

## Executive Summary

**Gaps Identified**: 4 critical issues preventing 10/10
1. ❌ Custom terminology not stored/used
2. ❌ Watchlist not persistent in research
3. ❌ Profile Coach violates context-aware prompting
4. ❌ Missing tooltips on action buttons

**Estimated Effort**: 12-14 hours total  
**Priority**: HIGH - Core UX promises not being kept

---

## Gap Analysis

### 🔴 GAP 1: Custom Terminology System (CRITICAL)
**Current**: Hardcoded "Buying Signals", "Custom Criteria"  
**Expected**: User's exact words ("Indicators", "Qualifiers", etc.)  
**Impact**: Breaks "uses your exact language" promise  
**Effort**: 4-5 hours

### 🔴 GAP 2: Watchlist Persistence (CRITICAL)
**Current**: Only shows detected signals  
**Expected**: Always shows all monitored items with status  
**Impact**: Users can't see what's being watched  
**Effort**: 3-4 hours

### 🔴 GAP 3: Profile Coach Constraints (HIGH)
**Current**: 500+ word responses with nested lists  
**Expected**: MAX 3 sentences, NO lists > 3 items  
**Impact**: Overwhelming, poor UX  
**Effort**: 2 hours

### 🔴 GAP 4: Missing Tooltips (MEDIUM)
**Current**: No tooltips on action buttons  
**Expected**: Helpful tooltips explaining each action  
**Impact**: Users don't understand features  
**Effort**: 2-3 hours

---

## Implementation Roadmap

### PHASE 1: Database Schema (30 minutes)

**File**: Create migration `supabase/migrations/YYYYMMDD_add_terminology_fields.sql`

```sql
-- Add custom terminology fields
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS signal_terminology TEXT DEFAULT 'Buying Signals',
  ADD COLUMN IF NOT EXISTS criteria_terminology TEXT DEFAULT 'Custom Criteria',
  ADD COLUMN IF NOT EXISTS watchlist_label TEXT DEFAULT 'Watchlist',
  ADD COLUMN IF NOT EXISTS show_watchlist_always BOOLEAN DEFAULT true;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_terminology 
  ON user_profiles(signal_terminology, criteria_terminology);

-- Update existing users to have defaults
UPDATE user_profiles 
SET 
  signal_terminology = 'Buying Signals',
  criteria_terminology = 'Custom Criteria',
  watchlist_label = 'Watchlist',
  show_watchlist_always = true
WHERE signal_terminology IS NULL;
```

**Verification**:
```sql
SELECT 
  id, 
  signal_terminology, 
  criteria_terminology, 
  watchlist_label 
FROM user_profiles 
LIMIT 5;
```

---

### PHASE 2: Onboarding Terminology Capture (1.5 hours)

**File**: `src/pages/OnboardingEnhanced.tsx`

**Step 1**: Add terminology capture after signal configuration

```tsx
// After user configures signals (around line 450)
const captureTerminology = async () => {
  // Ask for signal terminology
  await agent.sendMessage(
    "One last thing: what do you call these in your organization? " +
    "(e.g., 'Buying Signals', 'Indicators', 'Triggers', 'Events')"
  );
  
  const response = await waitForUserResponse();
  
  // Store terminology
  await supabase
    .from('user_profiles')
    .update({
      signal_terminology: response.trim(),
      watchlist_label: `${response.trim()} Watchlist`
    })
    .eq('user_id', userId);
  
  // Confirm
  await agent.sendMessage(
    `Perfect! I'll always call them "${response.trim()}" from now on.`
  );
};

// Call after signal setup
if (signals.length > 0) {
  await captureTerminology();
}
```

**Step 2**: Add criteria terminology capture

```tsx
// After user configures custom criteria
const captureCriteriaTerminology = async () => {
  await agent.sendMessage(
    "What do you call these qualifying factors? " +
    "(e.g., 'Custom Criteria', 'Qualifiers', 'Requirements')"
  );
  
  const response = await waitForUserResponse();
  
  await supabase
    .from('user_profiles')
    .update({ criteria_terminology: response.trim() })
    .eq('user_id', userId);
};
```

---

### PHASE 3: Prompt System Updates (2.5 hours)

**File**: `src/services/agents/BaseAgent.ts`

**Update 1**: Modify `buildSignalsSection` to use custom terminology

```typescript
protected buildSignalsSection(signals: SignalPreference[]): string {
  const profile = this.context.profile;
  const terminology = profile?.signal_terminology || 'Buying Signals';
  const watchlistLabel = profile?.watchlist_label || 'Watchlist';
  
  let prompt = `## ${terminology.toUpperCase()} CONFIGURATION (CRITICAL)

The user calls these "${terminology}" and has configured these time-sensitive events:

`;
  
  signals.forEach((signal, idx) => {
    prompt += `${idx + 1}. **${signal.signal_type}** (${signal.importance})
   - Importance: ${signal.importance}
   - Lookback: ${signal.lookback_days} days
`;
  });
  
  // Add watchlist requirement
  prompt += `\n### MANDATORY: "${watchlistLabel}" SECTION IN EVERY REPORT

**CRITICAL REQUIREMENT**: Include a dedicated "${watchlistLabel}" section in EVERY research report showing:

1. **ALL configured ${terminology.toLowerCase()}** (even if not detected)
2. **Status for each**:
   - ✅ Detected: [Event description + date]
   - No recent activity: (last [lookback_days] days)
3. **Format**:
   \`\`\`markdown
   ### ${watchlistLabel}
   ${signals.map(s => `- **${s.signal_type}**: [✅ Detected: description | No recent activity (last ${s.lookback_days} days)]`).join('\n   ')}
   \`\`\`

This section MUST appear even if NO ${terminology.toLowerCase()} were detected.
It shows the user what you're actively monitoring.

`;
  
  return prompt;
}
```

**Update 2**: Modify `buildCustomCriteriaSection` to use custom terminology

```typescript
protected buildCustomCriteriaSection(customCriteria: CustomCriteria[]): string {
  const profile = this.context.profile;
  const terminology = profile?.criteria_terminology || 'Custom Criteria';
  
  let prompt = `## ${terminology.toUpperCase()} (CRITICAL)

The user calls these "${terminology}" and has defined these SPECIFIC data points:

`;
  
  customCriteria.forEach((criteria, idx) => {
    prompt += `${idx + 1}. **${criteria.field_name}** (${criteria.importance})
   - Type: ${criteria.field_type}
   - Importance: ${criteria.importance}
`;
    if (criteria.hints && criteria.hints.length > 0) {
      prompt += `   - Hints: ${criteria.hints.join(", ")}
`;
    }
    prompt += `\n`;
  });
  
  prompt += `### FOR EVERY COMPANY YOU RESEARCH:
1. Evaluate ALL ${terminology.toLowerCase()} listed above
2. Include a "${terminology}" section in your output
3. Mark each as: Met ✅ | Not Met ❌ | Unknown ❓
4. Provide evidence for each determination

`;
  return prompt;
}
```

---

### PHASE 4: Research Template Updates (1.5 hours)

**File**: `src/services/agents/ResearchAgent.ts`

**Update**: Add watchlist to output requirements

```typescript
buildSystemPrompt(): string {
  const profile = this.context.profile;
  const watchlistLabel = profile?.watchlist_label || 'Watchlist';
  const signalTerm = profile?.signal_terminology || 'Buying Signals';
  
  return `You are an elite B2B research intelligence agent...

<output_requirements>
CRITICAL: Your research MUST include these sections in this order:

1. **Executive Summary** (2-3 sentences)
2. **${watchlistLabel}** (MANDATORY - show ALL configured ${signalTerm} with status)
3. **${profile?.criteria_terminology || 'Custom Criteria'}** (if configured)
4. **Company Overview**
5. **Key Findings**
6. **Decision Makers**
7. **Tech Stack** (if relevant)
8. **Recommended Actions**
9. **Sources**

### ${watchlistLabel} Section Requirements:
- ALWAYS include this section, even if no ${signalTerm.toLowerCase()} detected
- Show ALL configured ${signalTerm.toLowerCase()}
- Mark detected items with ✅
- Mark not detected with "No recent activity (last X days)"
- Include dates for detected events

Example:
\`\`\`markdown
### ${watchlistLabel}
- **Funding Round**: ✅ Detected - Series B announced 2 weeks ago ($25M)
- **Leadership Change**: No recent activity (last 90 days)
- **Acquisition**: No recent activity (last 180 days)
\`\`\`

</output_requirements>
`;
}
```

---

### PHASE 5: Profile Coach Fix (2 hours)

**File**: `src/services/agents/ResearchAgent.ts` (SettingsAgent class)

**Current Problem**: Ignores MAX 3 SENTENCES constraint

**Fix**: Strengthen constraints and add validation

```typescript
buildSystemPrompt(): string {
  const { profile, customCriteria, signals } = this.context;
  
  // ... existing logic ...
  
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
${profile?.signal_terminology || 'Buying Signals'}: ${signals.length} tracked

${missing.length > 0 ? `## MISSING: ${missing.join(', ')}` : '## PROFILE COMPLETE ✓'}

## CRITICAL RULES (ABSOLUTELY NON-NEGOTIABLE)
1. **MAX 3 SENTENCES TOTAL** - This is a hard limit. Not 4. Not 5. Exactly 3 or less.
2. **ONE QUESTION** at a time - Never ask multiple questions
3. **NO LISTS** - No bullet points, no numbered lists, no templates
4. **NO NESTED CONTENT** - No sub-items, no indentation, no hierarchies
5. **FOCUS**: Help with ICP/research setup, NOT personal profiles

## RESPONSE FORMAT (MANDATORY)
Line 1: [Acknowledge their input in 1 sentence]
Line 2: [Make 1 specific suggestion with WHY it matters]
Line 3: [Ask 1 clear question to move forward]

## EXAMPLES OF PERFECT RESPONSES

Example 1:
"Your ICP for enterprise cybersecurity is clear. Adding 2-3 custom criteria like 'Has CISO' or 'SOC2 certified' will help me find better-fit companies. Want to add those now?"

Example 2:
"You're targeting ${profile?.industry || 'your industry'} companies, which is a good start. Making your ICP more specific (e.g., '500+ employees, Series B+, uses AWS') will improve research quality by 3x. Should I help you refine it?"

Example 3:
"Your ${customCriteria.length} criteria are solid. Adding ${profile?.signal_terminology?.toLowerCase() || 'buying signals'} like 'recent funding' or 'leadership change' will alert you when companies are ready to buy. Want to set up 2-3?"

## VALIDATION RULES
Before sending ANY response:
1. Count sentences - must be ≤ 3
2. Check for lists - must have ZERO
3. Check for templates - must have ZERO
4. Check for nested content - must have ZERO
5. Verify ends with ONE question

If your response violates ANY rule, rewrite it to comply.

## WHAT HAPPENS IF YOU VIOLATE RULES
- 4+ sentences: Response rejected, try again
- Lists/bullets: Response rejected, try again
- Templates: Response rejected, try again
- Multiple questions: Response rejected, try again

**YOUR TASK**: Review the profile above and suggest 1 improvement in 3 sentences max.`;
}
```

---

### PHASE 6: Add Tooltips (2.5 hours)

**File**: `src/components/Tooltip.tsx` (create if doesn't exist)

```tsx
import { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`
          absolute z-50 px-3 py-2 text-sm font-medium text-white 
          bg-gray-900 rounded-lg shadow-sm tooltip
          ${position === 'top' ? 'bottom-full mb-2' : ''}
          ${position === 'bottom' ? 'top-full mt-2' : ''}
          ${position === 'left' ? 'right-full mr-2' : ''}
          ${position === 'right' ? 'left-full ml-2' : ''}
        `}>
          {content}
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
}
```

**File**: `src/pages/ResearchChat.tsx`

**Update**: Add tooltips to action buttons

```tsx
import { Tooltip } from '../components/Tooltip';

// In the "Next actions" section (around line 4116)
<Tooltip content="Ask a follow-up question about this research">
  <button onClick={() => handleActionBarAction('follow_up')}>
    🧠 Follow-up question
  </button>
</Tooltip>

<Tooltip content="Re-run research with latest data">
  <button onClick={() => handleActionBarAction('refresh')}>
    ↺ Refresh on this
  </button>
</Tooltip>

<Tooltip content="Focus on specific themes: leadership, funding, tech stack, news">
  <button onClick={() => handleActionBarAction('refine')}>
    🎯 Refine focus
  </button>
</Tooltip>

<Tooltip content="Generate a personalized outreach email">
  <button onClick={() => handleActionBarAction('draft_email')}>
    ✉️ Draft email
  </button>
</Tooltip>

<Tooltip content="Find verified email addresses for decision makers">
  <button onClick={() => handleActionBarAction('get_emails')}>
    🔒 Get verified emails
  </button>
</Tooltip>
```

---

### PHASE 7: UI Updates for Watchlist (2 hours)

**File**: `src/components/MessageBubble.tsx`

**Add**: Watchlist section rendering

```tsx
// Add after "Context Applied" section
{message.watchlist && (
  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-lg">👀</span>
      <h3 className="text-sm font-semibold text-blue-900">
        {profile?.watchlist_label || 'Watchlist'}
      </h3>
    </div>
    <div className="space-y-2">
      {message.watchlist.map((item, idx) => (
        <div 
          key={idx} 
          className={`flex items-start gap-2 text-sm ${
            item.detected ? 'text-green-700' : 'text-gray-600'
          }`}
        >
          <span className="text-lg">
            {item.detected ? '✅' : '○'}
          </span>
          <div className="flex-1">
            <div className="font-medium">{item.signal_type}</div>
            <div className="text-xs">
              {item.detected 
                ? `${item.description} (${item.date})`
                : `No recent activity (last ${item.lookback_days} days)`
              }
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

---

### PHASE 8: Testing & Validation (2 hours)

**Test Suite 1: Custom Terminology**

```typescript
describe('Custom Terminology', () => {
  it('should store custom signal terminology from onboarding', async () => {
    // 1. Complete onboarding with custom term "Indicators"
    // 2. Verify database has signal_terminology = "Indicators"
    // 3. Run research
    // 4. Verify prompt uses "INDICATORS CONFIGURATION"
    // 5. Verify output uses "Indicators" in headings
  });
  
  it('should use custom terminology in View my setup', async () => {
    // 1. Set signal_terminology = "Triggers"
    // 2. Open "View my setup" modal
    // 3. Verify modal shows "Triggers" not "Buying Signals"
  });
});
```

**Test Suite 2: Watchlist Persistence**

```typescript
describe('Watchlist Persistence', () => {
  it('should show watchlist even when no signals detected', async () => {
    // 1. Configure 3 signals
    // 2. Research company with NO signals
    // 3. Verify watchlist section appears
    // 4. Verify all 3 signals shown as "No recent activity"
  });
  
  it('should mark detected signals in watchlist', async () => {
    // 1. Configure "Funding Round" signal
    // 2. Research company that just raised funding
    // 3. Verify watchlist shows "✅ Detected - Series B..."
  });
});
```

**Test Suite 3: Profile Coach Constraints**

```typescript
describe('Profile Coach Constraints', () => {
  it('should respond with max 3 sentences', async () => {
    // 1. Open Profile Coach
    // 2. Ask for help
    // 3. Count sentences in response
    // 4. Assert ≤ 3 sentences
  });
  
  it('should not include lists', async () => {
    // 1. Open Profile Coach
    // 2. Ask for suggestions
    // 3. Verify response has no bullet points or numbered lists
  });
});
```

**Test Suite 4: Tooltips**

```typescript
describe('Tooltips', () => {
  it('should show tooltip on hover', async () => {
    // 1. Navigate to research page
    // 2. Hover over "Refine focus" button
    // 3. Verify tooltip appears
    // 4. Verify tooltip text is helpful
  });
});
```

---

## Success Criteria

### ✅ Custom Terminology (10/10)
- [ ] Database fields exist
- [ ] Onboarding captures terminology
- [ ] Prompts use custom terms
- [ ] Research output uses custom terms
- [ ] "View my setup" displays custom terms
- [ ] Profile Coach uses custom terms

### ✅ Watchlist Persistence (10/10)
- [ ] Watchlist section in EVERY research report
- [ ] ALL signals shown (detected + not detected)
- [ ] Detected signals marked with ✅
- [ ] Not detected shows "No recent activity"
- [ ] Dates shown for detected signals
- [ ] Custom watchlist label used

### ✅ Profile Coach (10/10)
- [ ] MAX 3 sentences enforced
- [ ] NO lists in responses
- [ ] ONE question per response
- [ ] NO templates or boilerplate
- [ ] Uses custom terminology

### ✅ Tooltips (10/10)
- [ ] All action buttons have tooltips
- [ ] Tooltips are helpful and clear
- [ ] Tooltips appear on hover
- [ ] Tooltips positioned correctly

---

## Implementation Timeline

### Day 1 (4 hours)
- ✅ Database schema
- ✅ Onboarding terminology capture
- ✅ Prompt system updates (signals)

### Day 2 (4 hours)
- ✅ Prompt system updates (criteria)
- ✅ Research template updates
- ✅ Profile Coach fix

### Day 3 (4 hours)
- ✅ Tooltip component
- ✅ Add tooltips to all buttons
- ✅ UI updates for watchlist
- ✅ Testing & validation

**Total**: 12 hours (1.5 days)

---

## Risk Assessment

**Low Risk**:
- Database schema (additive only)
- Tooltip component (new feature)
- Onboarding updates (additive)

**Medium Risk**:
- Prompt updates (could affect research quality)
- Mitigation: Test thoroughly with multiple companies

**High Risk**:
- Profile Coach constraints (AI may still violate)
- Mitigation: Add validation layer to reject non-compliant responses

---

## Rollout Plan

### Phase 1: Internal Testing (1 day)
- Deploy to staging
- Test all 4 fixes
- Verify no regressions

### Phase 2: Beta Testing (2 days)
- Deploy to 10 beta users
- Monitor for issues
- Gather feedback

### Phase 3: Full Rollout (1 day)
- Deploy to production
- Monitor metrics
- Document learnings

---

## Monitoring & Metrics

**Key Metrics**:
1. **Terminology Accuracy**: % of research using custom terms
2. **Watchlist Inclusion**: % of research with watchlist section
3. **Profile Coach Compliance**: % of responses ≤ 3 sentences
4. **Tooltip Engagement**: Hover rate on action buttons

**Success Targets**:
- Terminology accuracy: 100%
- Watchlist inclusion: 100%
- Profile Coach compliance: 95%+
- Tooltip engagement: 30%+

---

## Post-Implementation

### Documentation Updates
- [ ] Update UAT_COMPLIANCE_AUDIT.md
- [ ] Update 10_OUT_OF_10_ROADMAP.md
- [ ] Create TERMINOLOGY_GUIDE.md for users
- [ ] Update API documentation

### User Communication
- [ ] In-app announcement about custom terminology
- [ ] Email to existing users about watchlist feature
- [ ] Help center article on customization

---

## Final Checklist

Before marking as 10/10:

- [ ] All database migrations run successfully
- [ ] Onboarding captures terminology correctly
- [ ] Prompts use custom terminology
- [ ] Research includes watchlist section
- [ ] Profile Coach responses ≤ 3 sentences
- [ ] All action buttons have tooltips
- [ ] End-to-end test passes
- [ ] Beta users confirm improvements
- [ ] Documentation updated
- [ ] Monitoring in place

**Status**: READY TO IMPLEMENT 🚀

**Expected Outcome**: 10/10 UAT compliance, perfect alignment with user expectations
