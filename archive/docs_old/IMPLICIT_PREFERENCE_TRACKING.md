# 🧠 Implicit Preference Tracking System

**Created**: October 22, 2025  
**Status**: ✅ Implemented and Ready

---

## 🎯 What This Does

Automatically learns user preferences from their behavior **without asking**. The system tracks:
- Which sections users engage with most
- Preferred research depth (quick vs deep)
- Topics they ask follow-ups about
- Reports they save/share

Over time, the AI adapts to deliver exactly what the user wants without needing to ask "should I remember this?"

---

## 📊 How It Works

### **1. Track User Interactions**

```typescript
// When user expands a section
trackPreference({
  type: 'section_expanded',
  section: 'tech_stack',
  chatId: currentChatId
});

// When research completes
trackPreference({
  type: 'research_completed',
  depth: 'deep', // or 'quick'
  agentType: 'company_research',
  chatId: currentChatId
});

// When user asks follow-up
trackPreference({
  type: 'follow_up_asked',
  topic: 'funding',
  chatId: currentChatId
});
```

### **2. Derive Preferences Automatically**

The tracker analyzes patterns:

| Pattern | Threshold | Result |
|---------|-----------|--------|
| **Expanded section 3+ times** | 3 expansions > 2x collapses | `focus.tech_stack = true` (confidence: 0.7-0.9) |
| **Collapsed section 3+ times** | 3 collapses > 2x expansions | `focus.tech_stack = false` (confidence: 0.6-0.85) |
| **5+ deep researches** | deep > 2x quick | `coverage.depth = 'deep'` (confidence: 0.65-0.85) |
| **3+ follow-ups on topic** | Same topic 3+ times | `focus.{topic} = true` (confidence: 0.6-0.85) |
| **Saved report** | User saves research | All sections = true (confidence: 0.65) |

### **3. Save to Database**

- **Debounced**: Saves after 3 seconds of no activity
- **Deduplicated**: Keeps highest confidence for each key
- **Incremental**: Confidence increases with repetition

### **4. Injected Into Prompts**

On next request, preferences are loaded and included in the system prompt:

```
## LEARNED USER PREFERENCES

### Research Depth: DEEP
- Confidence: 85%
- ALWAYS use this depth unless explicitly overridden

### Primary Focus Areas:
- **tech_stack**: Always include detailed coverage
- **decision_makers**: Always include detailed coverage
```

---

## 🔧 Implementation Files

### **Core Tracker**
**File**: `lib/preferences/tracker.ts`

```typescript
export const preferenceTracker = new PreferenceTracker();

// Singleton that:
- Tracks interactions
- Derives preferences from patterns
- Debounces saves (3 seconds)
- Calls POST /api/preferences
```

### **React Hook**
**File**: `src/hooks/usePreferenceTracking.ts`

```typescript
const { track, flush, getState } = usePreferenceTracking(userId);

// Usage in components:
track({ type: 'section_expanded', section: 'tech_stack', chatId });
```

### **Integration Point**
**File**: `src/page-components/ResearchChat.tsx`

```typescript
// Initialized at component mount
const { track: trackPreference } = usePreferenceTracking(user?.id);

// Called at interaction points:
- Research completion
- Section expand/collapse
- Follow-up questions
- Preference confirmations
```

---

## 📈 Confidence Scoring

### **Sources**
- **followup**: User explicitly said "yes" → 0.95 confidence
- **implicit**: Derived from behavior → 0.60-0.85 confidence
- **system**: Default fallback → 0.80 confidence

### **Confidence Growth**
```typescript
// First time: 0.60
// Second time: 0.65
// Third time: 0.70
// Caps at: 0.85-0.90 for implicit, 0.95 for explicit
```

### **Threshold Behaviors**
```typescript
if (confidence > 0.8) {
  // High confidence → ALWAYS use preference
  "ALWAYS use this depth unless explicitly overridden"
} else if (confidence > 0.5) {
  // Medium → Prefer but offer alternatives
  "Prefer this depth but offer alternatives"
} else {
  // Low → Ask for clarification
  "Low confidence - ask for clarification"
}
```

---

## 🎯 Tracked Interactions

### **1. Section Engagement**
```typescript
{ 
  type: 'section_expanded',
  section: 'tech_stack' | 'decision_makers' | 'signals' | 'risks' | ...,
  chatId: string
}
```

Maps to: `focus.{section} = true/false`

### **2. Research Depth**
```typescript
{
  type: 'research_completed',
  depth: 'quick' | 'deep',
  agentType: 'company_research' | 'settings_agent',
  chatId: string
}
```

Maps to: `coverage.depth = 'shallow' | 'deep'`

### **3. Follow-Up Topics**
```typescript
{
  type: 'follow_up_asked',
  topic: 'funding' | 'hiring' | 'tech' | ...,
  chatId: string
}
```

Maps to: `focus.{topic} = true`

### **4. Report Saves**
```typescript
{
  type: 'report_saved',
  sections: ['tech_stack', 'decision_makers', ...],
  chatId: string
}
```

Maps to: All sections = true (0.65 confidence)

### **5. Explicit Confirmations**
```typescript
{
  type: 'preference_confirmed',
  key: 'focus.tech_stack',
  value: true,
  chatId: string
}
```

Maps to: Exact key/value (0.95 confidence)

---

## 💾 Storage Format

### **Database Table**: `user_preferences`

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  key TEXT NOT NULL,        -- e.g. 'focus.tech_stack'
  value JSONB,              -- true/false/string/number
  confidence NUMERIC(4,3),  -- 0.000 to 1.000
  source TEXT,              -- 'implicit', 'followup', 'system'
  updated_at TIMESTAMP,
  UNIQUE(user_id, key)
);
```

### **Example Rows**

| user_id | key | value | confidence | source |
|---------|-----|-------|------------|--------|
| abc123 | focus.tech_stack | true | 0.850 | implicit |
| abc123 | coverage.depth | "deep" | 0.750 | implicit |
| abc123 | focus.decision_makers | true | 0.650 | implicit |

---

## 🔄 User Experience Flow

### **Visit 1** (New User)
- No preferences stored
- AI uses smart defaults
- Asks: "Should I always prioritize X?"

### **Visit 3** (Implicit Learning)
- User expanded "Tech Stack" 3 times
- → `focus.tech_stack = true` (0.70 confidence)
- Next research: Tech stack automatically detailed

### **Visit 5** (Building Confidence)
- User always picks "deep" research
- 5 deep requests vs 0 quick
- → `coverage.depth = 'deep'` (0.75 confidence)
- AI adapts without asking

### **Visit 10** (Personalized)
- Multiple patterns recognized
- High confidence (0.85+)
- Fully tailored experience
- Rarely needs to ask

### **Explicit Override**
- User says "no, less tech detail"
- → `focus.tech_stack = false` (0.95 confidence)
- Immediately overrides implicit preference

---

## 🧪 Testing

### **Check Tracker State**
```typescript
const { getState } = usePreferenceTracking(userId);
console.log(getState());

// Output:
{
  sectionEngagement: Map {
    'tech_stack' => { expanded: 4, collapsed: 1 }
  },
  researchDepth: Map {
    'deep' => 5,
    'quick' => 1
  },
  followUpTopics: Map {
    'funding' => 3
  }
}
```

### **Manual Flush**
```typescript
const { flush } = usePreferenceTracking(userId);
await flush(); // Immediately save pending preferences
```

### **Verify Database**
```sql
SELECT key, value, confidence, source
FROM user_preferences
WHERE user_id = 'abc123'
ORDER BY updated_at DESC;
```

---

## 📊 Analytics

### **Track Learning Rate**
```sql
-- How quickly are preferences building?
SELECT 
  user_id,
  COUNT(*) as preference_count,
  AVG(confidence) as avg_confidence,
  MAX(confidence) as max_confidence
FROM user_preferences
WHERE source = 'implicit'
GROUP BY user_id;
```

### **Most Common Preferences**
```sql
-- What do users care about most?
SELECT 
  key,
  COUNT(*) as user_count,
  AVG(confidence) as avg_confidence
FROM user_preferences
WHERE source = 'implicit'
GROUP BY key
ORDER BY user_count DESC;
```

---

## ⚠️ Privacy & Control

### **User Control**
- All preferences visible in settings
- Users can delete any preference
- Clear "reset all preferences" option

### **Transparency**
- Confidence scores shown
- Source tracked (implicit vs explicit)
- Users can see what was learned

### **Opt-Out**
```typescript
// User can disable implicit tracking
if (userSettings.disableImplicitTracking) {
  return; // Skip all implicit tracking
}
```

---

## 🚀 Benefits

### **For Users**
- ✅ **No repetitive questions** - AI learns passively
- ✅ **Faster personalization** - Adapts within 3-5 uses
- ✅ **More relevant results** - Automatically optimized
- ✅ **Feels intelligent** - System "remembers" without asking

### **For Product**
- ✅ **Higher engagement** - Personalized from early
- ✅ **Better retention** - Users feel understood
- ✅ **Less friction** - No setup surveys needed
- ✅ **Data-driven** - Learn what users actually want

---

## 🎯 Next Steps

### **Immediate** (Already Done)
- ✅ Core tracker implemented
- ✅ React hook created
- ✅ Integration points identified

### **To Wire Up** (Next)
1. Add `trackPreference` calls in ResearchChat.tsx:
   - After research completes
   - On section expand/collapse
   - On follow-up questions
   - On preference confirmations

2. Test with real users

3. Monitor confidence growth

### **Future Enhancements**
- Track more granular interactions
- Add preference decay (old preferences fade)
- A/B test threshold values
- Add preference explanations in UI

---

## 📝 Example Integration

```typescript
// In ResearchChat.tsx:

const { track: trackPreference } = usePreferenceTracking(user?.id);

// After research completes:
useEffect(() => {
  if (!loading && streamingMessage) {
    trackPreference({
      type: 'research_completed',
      depth: runMode === 'quick' ? 'quick' : 'deep',
      agentType: 'company_research',
      chatId: currentChatId || ''
    });
  }
}, [loading, streamingMessage]);

// On section expand:
const handleSectionExpand = (section: string) => {
  setExpandedSections(prev => [...prev, section]);
  trackPreference({
    type: 'section_expanded',
    section,
    chatId: currentChatId || ''
  });
};

// On preference confirmation:
const handlePreferenceYes = (key: string, value: any) => {
  trackPreference({
    type: 'preference_confirmed',
    key,
    value,
    chatId: currentChatId || ''
  });
  // Also make explicit API call for high confidence
};
```

---

**Status**: ✅ **Ready for Integration**  
**Files Created**: 3  
**Integration Points**: Identified  
**Next**: Wire up tracking calls

🚀 **Let users teach the AI through their behavior!**
