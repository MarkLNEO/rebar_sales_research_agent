# RebarHQ Architecture Overview

**Last Updated**: 2025-10-22
**Status**: Production Ready

---

## System Architecture

### Technology Stack

**Framework**: Next.js 14 (App Router)
**Backend**: Next.js API Routes (Server-Side)
**Frontend**: React 18 + TypeScript
**Database**: Supabase (PostgreSQL)
**AI**: OpenAI GPT-4 (Structured Outputs + Reasoning)
**Styling**: Tailwind CSS
**Deployment**: Vercel

---

## Migration Summary

### What Changed

**Removed**:
- ❌ Express API server (830+ lines)
- ❌ Router abstraction layer
- ❌ Express middleware chains
- ❌ Duplicate helper functions
- ❌ Docker configuration (unnecessary for Vercel)

**Added**:
- ✅ Next.js API routes (streaming-optimized)
- ✅ Consolidated utilities in `app/api/lib/`
- ✅ Tailwind & PostCSS configuration
- ✅ App Router pages

**Preserved**:
- ✅ All React components in `src/`
- ✅ All contexts, hooks, and utilities
- ✅ All API functionality
- ✅ All authentication logic

### Performance Gains

| Metric | Before (Express) | After (Next.js) | Improvement |
|--------|------------------|-----------------|-------------|
| **Stream start** | 200-500ms | 10-20ms | **95% faster** |
| **Total overhead** | 360-820ms | 110-170ms | **70% reduction** |
| **Code lines** | 4,000+ | 1,200 | **70% less** |
| **Files** | 34 routes | 9 routes | **75% fewer** |

---

## Project Structure

```
migrate_routes/
├── app/                           # Next.js App Router
│   ├── api/                       # API Routes (Server-side)
│   │   ├── lib/
│   │   │   ├── auth.ts           # Authentication & credits
│   │   │   ├── memory.ts         # Memory block building
│   │   │   └── context.ts        # User context & prompts (MAIN PROMPT BUILDER)
│   │   ├── ai/chat/route.ts      # Streaming chat endpoint
│   │   ├── dashboard/greeting/route.ts
│   │   ├── profiles/update/route.ts
│   │   ├── accounts/manage/route.ts
│   │   ├── memory/block/route.ts
│   │   └── health/route.ts
│   │
│   ├── (pages)/                   # Frontend Pages (Client-side)
│   │   ├── page.tsx              # Home / Dashboard
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── profile-coach/page.tsx
│   │   ├── research/page.tsx
│   │   ├── settings/page.tsx
│   │   └── signals/page.tsx
│   │
│   └── layout.tsx                 # Root layout with providers
│
├── src/                           # React Components & Logic
│   ├── components/               # Reusable UI components
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom hooks
│   ├── page-components/          # Page-level components
│   ├── services/                 # API service layer
│   └── utils/                    # Utility functions
│
├── docs/                          # Documentation
│   ├── architecture/             # Architecture docs
│   ├── features/                 # Feature documentation
│   ├── testing/                  # Testing & UAT results
│   ├── optimization/             # Performance optimization
│   ├── guides/                   # User guides
│   └── CLAUDE_guides/            # External API references
│
├── scripts/                       # Database & utility scripts
├── supabase/                      # Database migrations
└── archive/                       # Archived/deprecated code
```

---

## Core Systems

### 1. Authentication & Authorization

**File**: [app/api/lib/auth.ts](../../app/api/lib/auth.ts)

**Flow**:
1. User signs in via Supabase Auth
2. JWT token issued by Supabase
3. All API requests include `Authorization: Bearer <token>` header
4. `verifyUser()` validates token and checks:
   - Email allowlist (if configured)
   - Domain allowlist (if configured)
   - Access bypass flag (dev only)
5. Returns user ID for subsequent operations

**Key Functions**:
- `verifyUser(request)` - Validates JWT and returns user
- `checkCredits(userId, cost)` - Verifies user has sufficient credits
- `deductCredits(userId, cost, metadata)` - Deducts and logs usage

---

### 2. Memory & Context System

**File**: [app/api/lib/memory.ts](../../app/api/lib/memory.ts)

**Purpose**: Builds comprehensive user context for AI requests

**Components**:

#### a. User Profile
```typescript
{
  company_name: string,
  industry: string,
  icp_definition: string,
  role: string,
  company_website: string
}
```

#### b. Custom Criteria
User-defined fields for ICP evaluation:
```typescript
{
  field_name: string,
  field_type: 'text' | 'number' | 'boolean',
  importance: 'critical' | 'high' | 'medium' | 'low',
  description: string
}
```

#### c. Learned Preferences
Auto-learned from user behavior (see [Preference Learning](../features/PREFERENCE_LEARNING.md)):
```typescript
{
  'coverage.depth': 'deep' | 'shallow',
  'focus.tech_stack': boolean,
  'focus.funding': boolean,
  'output_style': 'detailed' | 'concise'
}
```

#### d. Entity Aliases
Maps colloquial terms to formal names:
```typescript
{
  'alias': 'm365',
  'canonical_name': 'Microsoft 365',
  'category': 'microsoft_products'
}
```

**Main Function**: `buildMemoryBlock(userId, contextParams)`
- Fetches all context data in parallel
- Formats into structured prompt sections
- Returns ready-to-inject memory block

---

### 3. AI Prompt System

**File**: [app/api/lib/context.ts](../../app/api/lib/context.ts)

**⚠️ CRITICAL**: This is the **ONLY** active prompt builder in the application.

**Legacy files** (archived, not used):
- ❌ `src/config/agents.ts`
- ❌ `src/services/agents/BaseAgent.ts`
- ❌ `src/services/agents/GPT5*.ts`
- ❌ `src/services/agents/prompts/*`

**Prompt Structure**:

```
┌─────────────────────────────────────┐
│ SYSTEM PROMPT                       │
├─────────────────────────────────────┤
│ 1. Base Agent Instructions          │
│    - Agent type (research, profile) │
│    - Core capabilities              │
│    - Response format                │
│                                     │
│ 2. Learned Preferences (if any)    │
│    - Research depth                 │
│    - Focus areas                    │
│    - Output style                   │
│                                     │
│ 3. User Context                     │
│    - Company profile                │
│    - ICP definition                 │
│    - Custom criteria                │
│    - Entity aliases                 │
│                                     │
│ 4. Task-Specific Instructions       │
│    - Research mode (quick/deep)     │
│    - Special constraints            │
│    - Output requirements            │
└─────────────────────────────────────┘
```

**Key Function**: `buildSystemPrompt(agentType, memoryBlock, additionalContext)`

---

### 4. Streaming Chat System

**File**: [app/api/ai/chat/route.ts](../../app/api/ai/chat/route.ts)

**Features**:
- ✅ Direct `ReadableStream` implementation
- ✅ Zero intermediate buffering
- ✅ Native SSE (Server-Sent Events)
- ✅ Reasoning token streaming (100ms batches)
- ✅ Structured output support

**Flow**:
1. Validate user authentication
2. Build memory block with user context
3. Construct system prompt
4. Stream OpenAI API response
5. Parse and forward events to client
6. Deduct credits on completion

**Event Types**:
```typescript
{ type: 'reasoning', content: string }      // Thinking process
{ type: 'content', content: string }        // Main response
{ type: 'done' }                            // Stream complete
{ type: 'error', message: string }          // Error occurred
```

**Performance Optimizations**:
- Reasoning tokens batched every 100ms (prevents 400+ re-renders)
- Direct streaming (no buffering layer)
- Concurrent database queries
- Efficient prompt caching

---

### 5. Preference Learning System

**See**: [Feature Documentation](../features/PREFERENCE_LEARNING.md)

**Summary**:
- Tracks user interactions automatically
- Learns depth preferences (quick vs deep)
- Identifies topic interests (funding, tech stack, etc.)
- Adapts AI responses without asking
- Confidence-based preference resolution

**Key Files**:
- [src/page-components/ResearchChat.tsx](../../src/page-components/ResearchChat.tsx) - Tracking points
- [app/api/lib/memory.ts](../../app/api/lib/memory.ts) - Preference resolution
- [app/api/lib/context.ts](../../app/api/lib/context.ts) - Prompt injection

---

### 6. Database Schema

**Platform**: Supabase (PostgreSQL)

**Key Tables**:

#### `users`
```sql
id UUID PRIMARY KEY
email TEXT UNIQUE NOT NULL
created_at TIMESTAMPTZ
```

#### `profiles`
```sql
user_id UUID REFERENCES users(id)
company_name TEXT
industry TEXT
icp_definition TEXT
role TEXT
company_website TEXT
```

#### `user_preferences`
```sql
user_id UUID REFERENCES users(id)
preference_key TEXT NOT NULL
preference_value TEXT NOT NULL
confidence DECIMAL(3,2)
evidence_count INTEGER
last_observed_at TIMESTAMPTZ
UNIQUE(user_id, preference_key)
```

#### `entity_aliases`
```sql
alias TEXT PRIMARY KEY
canonical_name TEXT NOT NULL
category TEXT NOT NULL
```

#### `custom_criteria`
```sql
user_id UUID REFERENCES users(id)
field_name TEXT NOT NULL
field_type TEXT NOT NULL
importance TEXT NOT NULL
description TEXT
```

#### `tracked_accounts`
```sql
user_id UUID REFERENCES users(id)
company_name TEXT NOT NULL
domain TEXT
signals JSONB
last_checked TIMESTAMPTZ
```

#### `usage_ledger`
```sql
user_id UUID REFERENCES users(id)
credits_used INTEGER NOT NULL
tokens_consumed INTEGER
action TEXT NOT NULL
agent_type TEXT
metadata JSONB
created_at TIMESTAMPTZ
```

---

## API Endpoints

### Core Routes

#### `POST /api/ai/chat`
Streaming chat with OpenAI (optimized for reasoning)

**Request**:
```json
{
  "messages": [{ "role": "user", "content": "Research Acme Corp" }],
  "chatId": "chat-123",
  "agentType": "company_research",
  "mode": "deep" | "quick" | "specific"
}
```

**Response**: SSE stream of events

---

#### `GET /api/dashboard/greeting`
Dashboard greeting with account stats

**Response**:
```json
{
  "opening_line": "Welcome back! You're tracking 5 accounts...",
  "signals": [...]
}
```

---

#### `POST /api/profiles/update`
Update user profile and preferences

**Request**:
```json
{
  "profile": { ... },
  "custom_criteria": [ ... ]
}
```

---

#### `POST /api/accounts/manage`
Manage tracked accounts

**Request**:
```json
{
  "action": "add" | "remove" | "update",
  "company": { ... }
}
```

---

#### `GET /api/memory/block`
Fetch user memory block (for debugging)

**Response**:
```json
{
  "profile": { ... },
  "preferences": { ... },
  "custom_criteria": [ ... ],
  "entity_aliases": [ ... ]
}
```

---

#### `GET /api/health`
Health check endpoint (no auth required)

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T..."
}
```

---

## Security

### Authentication
- ✅ JWT-based authentication via Supabase
- ✅ Email/domain allowlisting support
- ✅ Service role key for admin operations
- ✅ Automatic token expiry

### Authorization
- ✅ Row-level security (RLS) on all user tables
- ✅ Credit-based access control
- ✅ Usage tracking and limits

### Data Privacy
- ✅ User data isolation (RLS policies)
- ✅ No cross-user data sharing
- ✅ GDPR-compliant data exports/deletions
- ✅ Encrypted credentials storage

---

## Performance Characteristics

### Latency Breakdown

| Operation | Latency | Notes |
|-----------|---------|-------|
| **Auth check** | 20-30ms | Supabase JWT validation |
| **Memory block build** | 40-80ms | Parallel DB queries |
| **Stream start** | 10-20ms | Direct streaming (no buffering) |
| **First token** | 200-400ms | OpenAI API TTFT |
| **Reasoning batch** | 100ms | Debounced UI updates |

### Throughput

- **Concurrent requests**: 100+ (Vercel autoscaling)
- **Stream duration**: Up to 280s (configurable)
- **Max tokens**: 16,000 (configurable)

---

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

**Benefits**:
- ✅ Automatic containerization
- ✅ Edge network deployment
- ✅ Instant rollbacks
- ✅ Environment variable management
- ✅ Automatic HTTPS

### Manual Deployment

```bash
npm run build
npm start
```

**Requirements**:
- Node.js 18+
- Environment variables configured
- PostgreSQL database accessible

---

## Environment Variables

### Required

```bash
SUPABASE_URL=              # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Service role key
OPENAI_API_KEY=            # OpenAI API key
OPENAI_MODEL=              # Model name (default: gpt-4)
```

### Optional

```bash
ACCESS_ALLOW_BYPASS=       # Bypass access control (dev only)
ACCESS_ALLOWLIST=          # Comma-separated allowed emails
ACCESS_ALLOWED_DOMAINS=    # Comma-separated allowed domains
STREAMING_DEADLINE_MS=     # Max streaming duration (default: 280000)
OPENAI_PROJECT=            # OpenAI project ID
```

---

## Monitoring & Debugging

### Logs

**Vercel Dashboard**:
- Real-time function logs
- Error tracking
- Performance metrics

**Local Development**:
```bash
npm run dev
# Logs appear in terminal
```

### Database Queries

```sql
-- Check user credits
SELECT credits_available FROM users WHERE id = 'USER_ID';

-- View usage history
SELECT * FROM usage_ledger
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Check learned preferences
SELECT * FROM user_preferences
WHERE user_id = 'USER_ID'
ORDER BY confidence DESC;
```

---

## Related Documentation

- [Preference Learning](../features/PREFERENCE_LEARNING.md) - Auto-learning system
- [UAT Results](../testing/UAT_RESULTS.md) - Test compliance
- [Migration Guide](../../docs/MIGRATION_GUIDE.md) - Express to Next.js migration
- [Optimization Summary](../../docs/OPTIMIZATION_SUMMARY.md) - Performance details

---

## Breaking Changes (From Express Version)

### For End Users
**None** - All endpoints and UI remain the same

### For Developers
- Import paths use `@/src/...` instead of relative paths
- API routes in `app/api/` instead of `server/routes/`
- Next.js navigation instead of React Router
- No Docker (Vercel handles containerization)

---

## Future Enhancements

### Planned
- [ ] Preference decay (time-based confidence reduction)
- [ ] Multi-tenant support
- [ ] Advanced caching layer
- [ ] Webhook support for real-time signals

### Under Consideration
- [ ] GraphQL API
- [ ] WebSocket support for real-time updates
- [ ] Edge runtime compatibility
- [ ] Self-hosted deployment guide

---

**Last Updated**: 2025-10-22
**Status**: ✅ **PRODUCTION READY**
