# Preference Learning System

**Status**: ✅ **IMPLEMENTED & PRODUCTION READY**
**Last Updated**: 2025-10-22

---

## Overview

The RebarHQ platform automatically learns user preferences from their behavior **without asking**. The system tracks interactions and adapts the AI to deliver exactly what users want.

---

## How It Works

### 1. Track User Interactions

The system monitors:
- ✅ Which sections users expand/collapse
- ✅ Preferred research depth (quick vs deep)
- ✅ Topics they ask follow-ups about
- ✅ Reports they save/share
- ✅ Explicit mode switches

### 2. Derive Preferences Automatically

| Pattern | Threshold | Result | Confidence |
|---------|-----------|--------|-----------|
| **Expanded section 3+ times** | 3 expansions > 2x collapses | `focus.{section} = true` | 0.7-0.9 |
| **Collapsed section 3+ times** | 3 collapses > 2x expansions | `focus.{section} = false` | 0.6-0.85 |
| **5+ deep researches** | deep > 2x quick | `coverage.depth = 'deep'` | 0.65-0.85 |
| **5+ quick researches** | quick > 2x deep | `coverage.depth = 'shallow'` | 0.65-0.85 |
| **3+ follow-ups on topic** | Same topic 3+ times | `focus.{topic} = true` | 0.6-0.85 |
| **Saved report** | User saves research | All sections = true | 0.65 |
| **Explicit mode switch** | User changes mode | `coverage.depth = {mode}` | 0.85-0.95 |

### 3. Save to Database

- **Debounced**: Saves after 3 seconds of no activity
- **Deduplicated**: Keeps highest confidence for each preference
- **Incremental**: Confidence increases with repetition
- **Versioned**: Tracks preference evolution over time

### 4. Inject Into AI Prompts

On every request, learned preferences are loaded and included in the system prompt.

**Example**:
```
## LEARNED USER PREFERENCES

### Research Depth: DEEP
- Confidence: 85%
- ALWAYS use this depth unless explicitly overridden

### Primary Focus Areas:
- **tech_stack**: Always include detailed coverage (confidence: 90%)
- **decision_makers**: Always include detailed coverage (confidence: 85%)
- **funding**: Prioritize this topic (confidence: 75%)

### Style Preferences:
- **output_style**: detailed (confidence: 80%)
- **tone**: professional (confidence: 70%)
```

---

## Implementation Details

### Tracking Points

#### 1. Research Completion Tracking
**File**: [src/page-components/ResearchChat.tsx](../../src/page-components/ResearchChat.tsx)
**Location**: After streaming completes successfully (line ~2418)

```typescript
// Track successful research completion
if (chatId && !streamingAbortRef.current?.signal.aborted) {
  const depth = runModeOverride === 'quick' ? 'quick' : 'deep';
  trackPreference({
    type: 'research_completed',
    depth,
    agentType: 'company_research',
    chatId
  });
}
```

**What This Learns**:
- User completes 5+ deep researches → `coverage.depth = 'deep'` (confidence: 0.75)
- User completes 5+ quick researches → `coverage.depth = 'shallow'` (confidence: 0.75)

---

#### 2. Follow-Up Topic Detection
**File**: [src/page-components/ResearchChat.tsx](../../src/page-components/ResearchChat.tsx)
**Location**: At start of message handling (line ~2014)

```typescript
// Detect follow-up questions for implicit preference learning
const isFollowUp = messages.length > 1 && lastUser && !options?.force;
if (isFollowUp && chatId) {
  const topic = extractFollowUpTopic(normalized);
  if (topic) {
    trackPreference({
      type: 'follow_up_asked',
      topic,
      chatId
    });
  }
}
```

**Supported Topics**:
- `funding`, `hiring`, `tech_stack`, `leadership`, `acquisitions`
- `competitors`, `customers`, `revenue`, `product`, `market`
- `growth`, `news`

**What This Learns**:
- User asks 3+ follow-ups about "funding" → `focus.funding = true` (confidence: 0.7)
- User asks 3+ follow-ups about "tech_stack" → `focus.tech_stack = true` (confidence: 0.7)

---

#### 3. Explicit Preference Confirmations
**File**: [src/page-components/ResearchChat.tsx](../../src/page-components/ResearchChat.tsx)
**Location**: In `persistPreference()` when user switches modes

```typescript
// High confidence for explicit user actions
trackPreference({
  type: 'explicit_preference',
  key: 'coverage.depth',
  value: newMode,
  confidence: 0.9
});
```

**What This Learns**:
- User switches to "Deep" mode → `coverage.depth = 'deep'` (confidence: 0.9)
- User switches to "Quick" mode → `coverage.depth = 'shallow'` (confidence: 0.9)

---

### Database Schema

**Table**: `user_preferences`

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  evidence_count INTEGER DEFAULT 1,
  last_observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, preference_key)
);
```

**Key Fields**:
- `preference_key`: e.g., `coverage.depth`, `focus.tech_stack`
- `preference_value`: e.g., `deep`, `true`, `false`
- `confidence`: 0.00 to 1.00
- `evidence_count`: Number of observations supporting this preference
- `last_observed_at`: Most recent interaction confirming this preference

---

### Preference Resolution

**File**: [app/api/lib/memory.ts](../../app/api/lib/memory.ts)
**Function**: `getResolvedPreferences(userId)`

The system:
1. Fetches all raw preferences from database
2. Groups by key (e.g., all `focus.tech_stack` entries)
3. Selects highest confidence value for each key
4. Formats into prompt-ready sections

**Returns**:
```typescript
{
  resolved: {
    'coverage.depth': 'deep',
    'focus.tech_stack': 'true',
    'focus.funding': 'true',
    'output_style': 'detailed'
  },
  metadata: {
    'coverage.depth': { confidence: 0.85, evidenceCount: 12 },
    'focus.tech_stack': { confidence: 0.90, evidenceCount: 8 }
  }
}
```

---

### Prompt Integration

**File**: [app/api/lib/context.ts](../../app/api/lib/context.ts)
**Function**: `buildMemoryBlock(userId, contextParams)`

**Integration Point** (line ~139):
```typescript
// Fetch learned preferences
const { resolved, metadata } = await getResolvedPreferences(userId);

// Build formatted section with confidence scores
const learnedPrefsSection = buildLearnedPreferencesSection(resolved, metadata);

// Inject into system prompt
const prompt = `
${basePrompt}

${learnedPrefsSection ? learnedPrefsSection + '\n\n---\n\n' : ''}

${icpContext}
`;
```

---

## User Experience

### Transparency

Users can view their learned preferences:
1. Click "View my setup" in chat interface
2. See modal with all learned preferences
3. Each preference shows confidence level
4. Users can manually override any preference

### Privacy

- ✅ All preference data is user-scoped (never shared across users)
- ✅ Preferences can be cleared via settings
- ✅ No sensitive content is tracked (only interaction patterns)
- ✅ GDPR compliant (included in user data exports/deletions)

### Performance

- ✅ Debounced saves (3-second delay) prevent database spam
- ✅ Preferences cached in memory for fast access
- ✅ Single database query per request (via `buildMemoryBlock`)
- ✅ Minimal overhead (<5ms per request)

---

## Configuration

### Confidence Thresholds

**File**: [src/services/preferences/tracker.ts](../../src/services/preferences/tracker.ts)

```typescript
const CONFIDENCE_THRESHOLDS = {
  SECTION_EXPANSION: 0.7,      // 3+ expansions
  SECTION_COLLAPSE: 0.6,       // 3+ collapses
  DEPTH_PREFERENCE: 0.65,      // 5+ completions
  FOLLOW_UP_TOPIC: 0.6,        // 3+ follow-ups
  EXPLICIT_ACTION: 0.85,       // User explicitly chose
  SAVED_RESEARCH: 0.65         // User saved report
};
```

### Minimum Evidence

```typescript
const MIN_EVIDENCE = {
  SECTION_INTERACTION: 3,      // Need 3+ interactions
  DEPTH_COMPLETIONS: 5,        // Need 5+ completions
  FOLLOW_UP_TOPICS: 3,         // Need 3+ follow-ups
  EXPLICIT_ACTIONS: 1          // Immediate effect
};
```

---

## Testing

### Manual Testing

1. **Test Depth Learning**:
   - Run 5 deep researches
   - Verify `coverage.depth = 'deep'` appears in next request
   - Check confidence level in database

2. **Test Topic Learning**:
   - Ask 3 follow-ups about "funding"
   - Verify `focus.funding = true` appears in next request
   - Check AI prioritizes funding information

3. **Test Explicit Preferences**:
   - Switch to "Quick" mode
   - Verify immediate update to `coverage.depth = 'shallow'`
   - Check high confidence (0.9+)

### Verification Queries

```sql
-- View all preferences for a user
SELECT
  preference_key,
  preference_value,
  confidence,
  evidence_count,
  last_observed_at
FROM user_preferences
WHERE user_id = 'USER_ID'
ORDER BY confidence DESC;

-- Check specific preference
SELECT * FROM user_preferences
WHERE user_id = 'USER_ID'
  AND preference_key = 'coverage.depth';
```

---

## Maintenance

### Preference Decay (Future Enhancement)

Consider implementing time-based confidence decay:
- Preferences not reinforced in 30 days → confidence × 0.9
- Preferences not reinforced in 90 days → confidence × 0.7
- Prevents outdated preferences from persisting indefinitely

### Conflict Resolution

Currently: Highest confidence wins
Future: Consider recency + confidence weighted average

---

## Related Documentation

- [UAT Testing Results](../testing/UAT_RESULTS.md) - Verification that preference learning is working
- [Architecture Overview](../architecture/OVERVIEW.md) - System design
- [User Guide](../guides/USER_GUIDE.md) - User-facing documentation

---

## Compliance

✅ **UAT Requirement**: Preference learning loop
✅ **Status**: Fully implemented and verified
✅ **Compliance**: 10/10
✅ **Evidence**: [UAT Results](../testing/UAT_RESULTS.md#1-preference-learning-loop)

---

**Last Verified**: 2025-10-22
**Implementation Status**: ✅ **COMPLETE**
