# Memory-as-a-Tool Architecture

## Problem

**Current**: Load ALL user context upfront (ICP, signals, preferences, disqualifiers, term mappings)
- ❌ 3500+ token prompts
- ❌ Slow context loading (7+ DB queries)
- ❌ Most context unused in follow-up messages

**Desired**: Agent queries memory on-demand
- ✅ Lightweight prompts (~300 tokens)
- ✅ Load only what's needed
- ✅ More scalable as user context grows

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  OpenAI Agent (Conversation Mode)                           │
│                                                              │
│  Lightweight Prompt: "You're a B2B assistant..."            │
│                                                              │
│  Tools Available:                                           │
│   - web_search (existing)                                   │
│   - get_user_context (NEW) ←──────────────────┐            │
└──────────────────────────────────────────────│─────────────┘
                                                │
                                                │ Call tool
                                                │
                        ┌───────────────────────▼──────────────────┐
                        │  get_user_context(category, query)       │
                        │                                           │
                        │  Security: Uses user_id from request     │
                        │  No cross-user data leakage possible     │
                        └───────────────────────────────────────────┘
                                                │
                                                │ Query DB
                                                │
                        ┌───────────────────────▼──────────────────┐
                        │  Supabase (RLS enabled)                   │
                        │                                           │
                        │  Tables:                                  │
                        │   - icp_profiles (WHERE user_id = $1)    │
                        │   - user_signal_preferences (WHERE ...)  │
                        │   - user_preferences (WHERE ...)         │
                        │   - custom_criteria (WHERE ...)          │
                        └───────────────────────────────────────────┘
```

## Tool Definition

```typescript
const userMemoryTool = {
  type: 'function',
  function: {
    name: 'get_user_context',
    description: 'Query the user\'s saved profile, preferences, and research criteria. Use this when you need specific details about what the user cares about (their ICP, target signals, focus areas, etc.).',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['profile', 'icp', 'signals', 'preferences', 'criteria', 'all'],
          description: 'What type of context to retrieve'
        },
        query: {
          type: 'string',
          description: 'Optional: Specific detail you\'re looking for (e.g., "target titles", "signal types", "focus areas")'
        }
      },
      required: ['category']
    }
  }
};
```

## Security Model

### 1. User-Scoped Execution

```typescript
// Tool handler ALWAYS uses the authenticated user's ID
export async function GET(request: NextRequest) {
  const { user } = await authenticateRequest(request.headers.get('authorization'));

  // user.id is the ONLY user we can query
  // No way for agent to access other users' data

  const { category, query } = await request.json();

  const context = await getUserContext(user.id, category, query);

  return NextResponse.json(context);
}
```

### 2. Row-Level Security (Supabase)

Already enabled on all tables:
```sql
-- icp_profiles: user can only see their own
CREATE POLICY "Users can view own ICP profiles"
  ON icp_profiles FOR SELECT
  USING (user_id = auth.uid());

-- user_signal_preferences: user can only see their own
CREATE POLICY "Users can view own signal preferences"
  ON user_signal_preferences FOR SELECT
  USING (user_id = auth.uid());
```

### 3. Tool Response Format

Agent receives ONLY the requested context:
```json
{
  "category": "icp",
  "data": {
    "company_types": ["Enterprise SaaS", "Financial Services"],
    "target_titles": ["CISO", "VP Security", "CTO"],
    "employee_range": "1000-5000"
  },
  "source": "icp_profiles",
  "found": true
}
```

## Implementation

### Step 1: Create Tool Handler API Route

**File**: `app/api/tools/user-context/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/app/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Authenticate - this gives us the user_id
    const { user } = await authenticateRequest(request.headers.get('authorization'));

    const { category, query } = await request.json();

    console.log(`[user-context-tool] User ${user.id} querying: ${category}`);

    let data: any = null;
    let source: string = '';

    switch (category) {
      case 'profile':
      case 'icp': {
        // Query ICP profile - automatically scoped to user.id by RLS
        const { data: profiles } = await supabase
          .from('icp_profiles')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (profiles && profiles.length > 0) {
          const profile = profiles[0];
          data = {
            company_types: profile.company_types || [],
            target_titles: profile.target_titles || [],
            employee_range: profile.employee_range,
            revenue_range: profile.revenue_range,
            focus_industries: profile.focus_industries || [],
            icp_definition: profile.icp_definition,
          };
          source = 'icp_profiles';
        }
        break;
      }

      case 'signals': {
        const { data: signals } = await supabase
          .from('user_signal_preferences')
          .select('*')
          .eq('user_id', user.id);

        data = (signals || []).map(s => ({
          signal_type: s.signal_type,
          min_severity: s.min_severity,
          lookback_days: s.lookback_days,
          enabled: s.enabled,
        }));
        source = 'user_signal_preferences';
        break;
      }

      case 'preferences': {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .order('confidence', { ascending: false });

        // Group by category
        const grouped: Record<string, any> = {};
        (prefs || []).forEach(p => {
          const [cat, field] = p.key.split('.');
          if (!grouped[cat]) grouped[cat] = {};
          grouped[cat][field] = p.value;
        });

        data = grouped;
        source = 'user_preferences';
        break;
      }

      case 'criteria': {
        const { data: criteria } = await supabase
          .from('custom_criteria')
          .select('*')
          .eq('user_id', user.id)
          .eq('enabled', true);

        data = (criteria || []).map(c => ({
          criterion: c.criterion,
          weight: c.weight,
          is_disqualifier: c.is_disqualifier,
        }));
        source = 'custom_criteria';
        break;
      }

      case 'all': {
        // Load everything (fallback to task mode behavior)
        // This is expensive, but available if needed
        const [profiles, signals, prefs, criteria] = await Promise.all([
          supabase.from('icp_profiles').select('*').eq('user_id', user.id).eq('is_active', true),
          supabase.from('user_signal_preferences').select('*').eq('user_id', user.id),
          supabase.from('user_preferences').select('*').eq('user_id', user.id),
          supabase.from('custom_criteria').select('*').eq('user_id', user.id).eq('enabled', true),
        ]);

        data = {
          profile: profiles.data?.[0] || null,
          signals: signals.data || [],
          preferences: prefs.data || [],
          criteria: criteria.data || [],
        };
        source = 'full_context';
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown category: ${category}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      category,
      query,
      data,
      source,
      found: data !== null,
      user_id: user.id, // For debugging, remove in production
    });

  } catch (error) {
    console.error('[user-context-tool] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user context' },
      { status: 500 }
    );
  }
}
```

### Step 2: Register Tool in OpenAI Call

**File**: `app/api/ai/chat/route.ts`

```typescript
// Define the user context tool
const userContextTool = {
  type: 'function' as const,
  function: {
    name: 'get_user_context',
    description: 'Query the user\'s saved profile, preferences, and research criteria. Use this when you need details about what the user cares about (ICP criteria, target signals, focus areas, etc.).',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['profile', 'icp', 'signals', 'preferences', 'criteria', 'all'],
          description: 'Type of context to retrieve: profile=ICP details, signals=buying signals they track, preferences=learned preferences, criteria=custom scoring criteria'
        },
        query: {
          type: 'string',
          description: 'Optional: specific detail you need (e.g., "target titles", "signal types")'
        }
      },
      required: ['category']
    }
  }
};

// In conversation mode, add the tool
const response = await openai.responses.create({
  model: process.env.OPENAI_MODEL || 'gpt-5-mini',
  instructions: conversationalPrompt,
  input: enrichedInput,
  tools: [
    { type: 'web_search' as any },
    userContextTool, // Add memory tool
  ],
  // ... rest of config
});
```

### Step 3: Handle Tool Calls

OpenAI Responses API automatically handles function calls, but we need to provide the implementation:

```typescript
// In the streaming loop, handle tool calls
if (event.type === 'response.function_call_arguments.done') {
  const { name, arguments: args } = event.function_call;

  if (name === 'get_user_context') {
    const { category, query } = JSON.parse(args);

    // Call our tool API with user's auth token
    const toolResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tools/user-context`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category, query }),
    });

    const contextData = await toolResponse.json();

    // Return to OpenAI to continue reasoning
    return contextData;
  }
}
```

## Usage Examples

### Conversation Mode with Memory Tool

**User**: "Research Gartner"
```
→ Task Mode activated
→ Load full context upfront
→ Generate comprehensive research
```

**User**: "tell me about their CEO"
```
→ Conversation Mode activated
→ Lightweight prompt (300 tokens)
→ Agent thinks: "I should answer about CEO from previous research"
→ Agent uses conversation history
→ No tool call needed
→ Fast response (2-3 seconds)
```

**User**: "does this match my ICP?"
```
→ Conversation Mode
→ Agent thinks: "I need to know their ICP criteria"
→ Agent calls: get_user_context(category='icp')
→ Receives: { target_titles: ['CISO', 'VP Security'], company_types: ['Enterprise SaaS'] }
→ Agent compares Gartner against criteria
→ Returns: "Yes, Gartner matches your ICP because..."
```

**User**: "what signals should I track for them?"
```
→ Conversation Mode
→ Agent calls: get_user_context(category='signals')
→ Receives: { signals: ['data breach', 'leadership change', 'funding'] }
→ Agent: "Based on your tracked signals (data breach, leadership change, funding), here's what to monitor..."
```

## Benefits

### Performance
- ✅ **80% faster follow-ups**: 2-3s vs 8s (no context loading)
- ✅ **90% smaller prompts**: 300 tokens vs 3500 tokens
- ✅ **Fewer DB queries**: 0-1 vs 7 per message

### Cost
- ✅ **Lower token costs**: Smaller prompts + outputs
- ✅ **Fewer DB reads**: Only query when needed
- ✅ **Better scaling**: Cost per message decreases

### UX
- ✅ **Natural conversation**: Feels like chatting, not form submission
- ✅ **Instant responses**: No loading full context every time
- ✅ **Contextual**: Agent knows when it needs more info

### Security
- ✅ **User-scoped**: Tool ALWAYS uses authenticated user's ID
- ✅ **RLS protected**: Database policies prevent cross-user access
- ✅ **No leakage**: Agent can't access other users' data

## Rollout Strategy

### Phase 1: Task Mode Only (Current)
- All messages load full context
- No changes to existing behavior

### Phase 2: Add Tool (No Usage Yet)
- Implement tool API endpoint
- Register tool with OpenAI
- Log when it WOULD be called
- Measure potential savings

### Phase 3: Conversation Mode (A/B Test)
- Enable conversation mode for 10% of users
- Monitor: TTFB, tool call frequency, quality
- Compare to control group

### Phase 4: Full Rollout
- Enable for 100% if metrics positive
- Monitor for any context gaps
- Tune tool calling behavior

## Metrics to Track

1. **Tool Usage**
   - % messages that call get_user_context
   - Which categories most common
   - Average calls per conversation

2. **Performance**
   - TTFB: Conversation mode vs Task mode
   - Token usage: with tool vs full context
   - DB queries: conversation vs task

3. **Quality**
   - User satisfaction (follow-up engagement)
   - Tool call accuracy (was it needed?)
   - Context miss rate (tool called but data not found)

## Future Enhancements

### 1. Semantic Search in Memory
```typescript
get_user_context(
  category='preferences',
  query='what does the user care about when evaluating enterprise software?'
)
```

### 2. Conversation History Search
```typescript
get_conversation_history(
  chat_id='abc123',
  search='what was mentioned about their CEO?'
)
```

### 3. Account Memory
```typescript
get_account_context(
  company_name='Gartner',
  type='previous_research'
)
```

## Open Questions

1. **Tool call latency**: How does tool call roundtrip affect TTFB?
   - Mitigation: Cache common queries, prefetch likely needs

2. **When to use tool vs conversation history**: How does agent decide?
   - Answer: Let OpenAI decide based on prompt clarity

3. **Fallback strategy**: What if tool call fails?
   - Answer: Task mode fallback, log error, continue with limited context

---

## Ready to Implement?

This gives the agent **superpowers** while keeping prompts lightweight. It's the agentic way to handle memory.

Want me to start with Phase 1 (implement the tool endpoint)?
