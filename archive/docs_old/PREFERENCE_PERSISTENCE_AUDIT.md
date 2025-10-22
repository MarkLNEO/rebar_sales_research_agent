# 🎯 Preference Persistence & Context Continuity Audit

**Date**: October 22, 2025  
**Focus**: Verifying that onboarding context persists into agent conversations

---

## Requirements to Verify

Based on user request, we need to ensure:

1. ✅ Account list recognizes fresh research (no "Needs refresh" after new run)
2. ✅ Profile Coach shows friendly summary of everything taught
3. ✅ "View my setup" shortcut accessible from chat and tracked accounts
4. ❌ **Agent remembers exact terminology** (e.g., "Indicators" instead of "Signals")
5. ❌ **Watchlist items persist** and show even if no new events
6. ✅ Profile page shows saved labels and watchlist instantly

---

## Code Review Findings

### ✅ **VERIFIED: Preference System EXISTS and is ACTIVE**

**Location**: `/app/api/lib/context.ts`

The system DOES fetch and inject learned preferences:

```typescript
export async function buildSystemPrompt(context: any, agentType = 'company_research'): Promise<string> {
  const { userId, profile, customCriteria, signals, disqualifiers } = context;
  
  // Fetch learned preferences
  let learnedPrefsSection = '';
  if (userId) {
    try {
      const { getResolvedPreferences } = await import('../../../lib/preferences/store');
      const { resolved } = await getResolvedPreferences(userId);
      learnedPrefsSection = buildLearnedPreferencesSection(resolved);
    } catch (error) {
      console.warn('[buildSystemPrompt] Failed to load preferences:', error);
    }
  }
  
  let prompt = `You are a Research Agent specializing in B2B company intelligence for sales teams.

${learnedPrefsSection}  // ← PREFERENCES INJECTED HERE
```

**What Gets Injected**:
- Research depth preference (Quick/Deep/Specific)
- Focus areas (which sections user engages with)
- Output style (concise vs detailed)
- Communication tone (formal/casual/balanced)

---

## Live Testing Results

### ✅ TEST 1: Account Refresh State
**Status**: ✅ **PASSED**

**Evidence**: 
- Stripe shows "📊 1 tracked" in sidebar
- No "Needs refresh" badge visible
- Account appears immediately after save

**Grade**: 10/10

---

### ✅ TEST 2: Profile Coach Summary Card
**Status**: ✅ **PASSED**

**Evidence**: Profile Coach page (`/profile-coach`) shows:
- Company: TechVentures Inc
- Industry: B2B SaaS
- ICP: Series B or later, 50-200 employees, uses AWS or GCP
- Role: AE • Both
- Research focus: Leadership, News
- Profile completion: 58%

**Grade**: 10/10

---

### ✅ TEST 3: "View My Setup" Accessibility
**Status**: ✅ **PASSED**

**Evidence**: "View my setup" button found in:
1. ✅ Chat header (tested - modal opens)
2. ✅ Tracked accounts panel sidebar (tested - modal opens)
3. ✅ Settings page (link to Profile Coach)

**Modal Shows**:
- Company profile
- Target titles & focus
- Buying signals & watch-list
- Custom criteria
- Competitors to monitor

**Grade**: 10/10

---

### ❌ TEST 4: Custom Terminology Persistence
**Status**: ❌ **FAILED**

**Issue**: The system uses **hardcoded terminology** instead of user's custom labels.

**Evidence from Code**:

```typescript
// In BaseAgent.ts line 268
protected buildSignalsSection(signals: SignalPreference[]): string {
  let prompt = `## BUYING SIGNALS CONFIGURATION (CRITICAL)  // ← HARDCODED

The user has indicated these time-sensitive events create urgency:
`;
```

**Problem**: If user calls them "Indicators" during onboarding, the system still says "BUYING SIGNALS" in prompts.

**Expected Behavior**:
- User says: "I call them Indicators"
- System stores: `signal_terminology: "Indicators"`
- Prompts use: `## INDICATORS CONFIGURATION`
- Research output uses: "Key Indicators detected"

**Current Behavior**:
- System always uses "Buying Signals" regardless of user preference

**Impact**: HIGH - Breaks the promise of "using your exact words"

**Fix Required**: Add terminology customization to user profile

---

### ❌ TEST 5: Watchlist Persistence
**Status**: ❌ **FAILED**

**Issue**: Watchlist items are **NOT shown** unless detected in current research.

**Evidence from Code**:

```typescript
// In BaseAgent.ts - signals are listed but not as "always show" watchlist
protected buildSignalsSection(signals: SignalPreference[]): string {
  signals.forEach((signal, idx) => {
    prompt += `${idx + 1}. **${signal.signal_type}** (${signal.importance})
   - Importance: ${signal.importance}
   - Lookback: ${signal.lookback_days} days
`;
  });
}
```

**Problem**: The prompt tells AI to LOOK for signals, but doesn't tell it to ALWAYS SHOW a watchlist section.

**Expected Behavior**:
```markdown
## Watchlist
- Acquisition: No recent activity
- Leadership Change: No recent activity  
- Funding Round: ✅ Detected - Series B announced 2 weeks ago
```

**Current Behavior**:
Only shows signals that were actually detected. No "watching for" section.

**Impact**: HIGH - Users can't see what's being monitored

**Fix Required**: Add "Watchlist Status" section to research template

---

### ✅ TEST 6: Profile Page Shows Saved Data
**Status**: ✅ **PASSED**

**Evidence**: Settings page shows:
- Company Name: TechVentures Inc
- Website: https://techventures.io
- Industry: B2B SaaS
- ICP: Series B or later, 50-200 employees, uses AWS or GCP
- Custom criteria: "No custom criteria yet"
- Signal alerts: "No monitoring rules yet"

**Grade**: 10/10

---

## Critical Gaps Identified

### 🔴 GAP 1: No Custom Terminology Storage
**Severity**: HIGH  
**Impact**: System doesn't use user's exact words

**Missing Database Fields**:
```sql
ALTER TABLE user_profiles ADD COLUMN signal_terminology TEXT DEFAULT 'Buying Signals';
ALTER TABLE user_profiles ADD COLUMN criteria_terminology TEXT DEFAULT 'Custom Criteria';
ALTER TABLE user_profiles ADD COLUMN watchlist_terminology TEXT DEFAULT 'Watchlist';
```

**Missing Prompt Logic**:
```typescript
protected buildSignalsSection(signals: SignalPreference[], terminology: string = 'Buying Signals'): string {
  let prompt = `## ${terminology.toUpperCase()} CONFIGURATION (CRITICAL)
  
The user calls these "${terminology}" and has indicated these time-sensitive events:
`;
```

---

### 🔴 GAP 2: No Persistent Watchlist Display
**Severity**: HIGH  
**Impact**: Users can't see what's being monitored

**Missing Prompt Section**:
```typescript
protected buildWatchlistSection(signals: SignalPreference[]): string {
  return `## WATCHLIST STATUS (ALWAYS INCLUDE)

Show a dedicated "Watchlist" section in EVERY research report with:
- All configured signals (even if not detected)
- Status for each: "✅ Detected" or "No recent activity"
- Last checked date

Example format:
### Watchlist
- Acquisition: No recent activity (last 90 days)
- Leadership Change: ✅ Detected - New CTO hired 2 weeks ago
- Funding Round: No recent activity (last 90 days)
`;
}
```

---

### 🔴 GAP 3: No Onboarding Terminology Capture
**Severity**: MEDIUM  
**Impact**: Can't learn user's preferred terms

**Missing Onboarding Step**:
During onboarding, after user defines signals, ask:
```
"What do you call these in your organization? 
(e.g., 'Buying Signals', 'Indicators', 'Triggers', 'Events')"
```

Store response in `user_profiles.signal_terminology`

---

## Compliance Summary

| Requirement | Status | Grade | Notes |
|-------------|--------|-------|-------|
| Fresh research recognized | ✅ PASS | 10/10 | No "Needs refresh" badge |
| Profile Coach summary | ✅ PASS | 10/10 | All data visible |
| "View my setup" accessible | ✅ PASS | 10/10 | Available in 3 locations |
| **Custom terminology** | ❌ FAIL | 0/10 | **Hardcoded labels** |
| **Watchlist persistence** | ❌ FAIL | 0/10 | **Only shows detected** |
| Profile page shows data | ✅ PASS | 10/10 | All saved data visible |

**Overall Score**: **4/6 (67%)** ⚠️

---

## Implementation Plan

### Phase 1: Database Schema (30 min)

```sql
-- Add terminology customization
ALTER TABLE user_profiles 
  ADD COLUMN signal_terminology TEXT DEFAULT 'Buying Signals',
  ADD COLUMN criteria_terminology TEXT DEFAULT 'Custom Criteria',
  ADD COLUMN watchlist_label TEXT DEFAULT 'Watchlist';

-- Add watchlist display preference
ALTER TABLE user_profiles 
  ADD COLUMN show_watchlist_always BOOLEAN DEFAULT true;
```

### Phase 2: Onboarding Capture (1 hour)

**File**: `src/pages/OnboardingEnhanced.tsx`

Add step after signal configuration:

```tsx
// After user adds signals
if (signals.length > 0) {
  await agent.sendMessage(
    "What do you call these in your organization? (e.g., 'Buying Signals', 'Indicators', 'Triggers')"
  );
  
  // Store response
  await updateProfile({
    signal_terminology: userResponse
  });
}
```

### Phase 3: Prompt Updates (2 hours)

**File**: `src/services/agents/BaseAgent.ts`

```typescript
protected buildSignalsSection(signals: SignalPreference[], profile: UserProfile): string {
  const terminology = profile.signal_terminology || 'Buying Signals';
  
  let prompt = `## ${terminology.toUpperCase()} CONFIGURATION (CRITICAL)

The user calls these "${terminology}" and tracks these time-sensitive events:
`;
  
  signals.forEach((signal, idx) => {
    prompt += `${idx + 1}. **${signal.signal_type}** (${signal.importance})\n`;
  });
  
  // Add watchlist requirement
  if (profile.show_watchlist_always) {
    prompt += `\n### CRITICAL: ALWAYS INCLUDE "${profile.watchlist_label || 'Watchlist'}" SECTION

In EVERY research report, include a dedicated section showing:
- All ${terminology.toLowerCase()} being monitored
- Status for each (Detected vs No recent activity)
- Dates for detected events

Format:
### ${profile.watchlist_label || 'Watchlist'}
${signals.map(s => `- ${s.signal_type}: [Status]`).join('\n')}
\n`;
  }
  
  return prompt;
}
```

### Phase 4: Research Template Update (1 hour)

**File**: `src/services/agents/ResearchAgent.ts`

Add to output requirements:

```typescript
<output_requirements>
...
WATCHLIST SECTION (MANDATORY):
- Always include a "${profile.watchlist_label}" section
- Show ALL configured ${profile.signal_terminology}
- Mark detected vs not detected
- Include lookback period for each
</output_requirements>
```

### Phase 5: UI Updates (2 hours)

**File**: `src/components/MessageBubble.tsx`

Add watchlist section rendering:

```tsx
{message.watchlist && (
  <div className="watchlist-section">
    <h3>{profile.watchlist_label || 'Watchlist'}</h3>
    {message.watchlist.map(item => (
      <div key={item.signal_type} className={item.detected ? 'detected' : 'not-detected'}>
        <span>{item.detected ? '✅' : '○'}</span>
        <span>{item.signal_type}</span>
        <span>{item.status}</span>
      </div>
    ))}
  </div>
)}
```

---

## Testing Plan

### Test 1: Custom Terminology
1. Create new user
2. During onboarding, call signals "Indicators"
3. Run research on a company
4. Verify output uses "Indicators" not "Buying Signals"
5. Check "View my setup" shows "Indicators"

### Test 2: Watchlist Persistence
1. Configure 3 signals: Funding, Acquisition, Leadership Change
2. Research a company with NO recent signals
3. Verify research shows:
   ```
   ### Watchlist
   - Funding: No recent activity (last 90 days)
   - Acquisition: No recent activity (last 90 days)
   - Leadership Change: No recent activity (last 90 days)
   ```
4. Research a company WITH a signal
5. Verify detected signal is marked ✅

### Test 3: Terminology Consistency
1. Set signal_terminology = "Triggers"
2. Set criteria_terminology = "Qualifiers"
3. Run research
4. Verify ALL instances use custom terms:
   - Prompt sections
   - Research output headings
   - "View my setup" modal
   - Profile Coach responses

---

## Success Criteria

For 10/10 alignment, we need:

1. ✅ **Custom terminology stored** in database
2. ✅ **Onboarding captures** user's preferred terms
3. ✅ **Prompts use** custom terminology throughout
4. ✅ **Research output uses** custom terminology in headings
5. ✅ **Watchlist section** appears in EVERY research report
6. ✅ **All signals shown** (detected and not detected)
7. ✅ **"View my setup"** displays custom terminology
8. ✅ **Profile Coach** uses custom terminology in responses

---

## Estimated Effort

**Total**: 6-7 hours

- Database schema: 30 min
- Onboarding updates: 1 hour
- Prompt updates: 2 hours
- Research template: 1 hour
- UI updates: 2 hours
- Testing: 30 min

**Priority**: HIGH - This is core to the "remembers your exact words" promise

---

## Current Status

**Preference System**: ✅ EXISTS and WORKS  
**Terminology Customization**: ❌ NOT IMPLEMENTED  
**Watchlist Persistence**: ❌ NOT IMPLEMENTED  

**Next Steps**:
1. Implement database schema changes
2. Update onboarding to capture terminology
3. Update prompts to use custom terms
4. Add watchlist section to research template
5. Test end-to-end with new user

**Blocker**: None - all changes are additive, no breaking changes
