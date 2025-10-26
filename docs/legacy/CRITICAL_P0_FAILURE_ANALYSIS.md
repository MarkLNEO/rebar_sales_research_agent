# CRITICAL: P0 Performance Fixes FAILED - Analysis

**Date:** October 22, 2025
**Status:** ❌ **PRODUCTION BLOCKING - IMMEDIATE ACTION REQUIRED**

---

## Executive Summary

The P0 performance fixes deployed to production have **FAILED catastrophically**:

- **TTFB increased from 25.3s → 64.3s** (153% regression)
- **Total time: 158.9 seconds** (2 minutes 38 seconds) vs expected <10s
- **Mode selection broken**: "Deep" selected instead of "Quick" despite keyword detection
- **Cache appears non-functional** in Vercel's serverless environment

**Impact:** Performance is now WORSE than baseline. Production launch blocked.

---

## Test Results - Quick Brief on Stripe

### Performance Metrics
| Metric | Expected | Actual | Delta |
|--------|----------|--------|-------|
| **TTFB** | 2-4s (cache miss) | 64.3s | +1507% ❌ |
| **Total Time** | 5-15s | 158.9s | +960% ❌ |
| **Mode** | Quick | Deep | WRONG ❌ |
| **Output Length** | 400-600 words | Unknown | Not verified |

### Console Logs
```
[LOG] [LLM][research] request {url: /api/ai/chat}
[LOG] [DEBUG] Response status: 200
[LOG] [LLM][research] first-delta {ttfbMs: 64297.10000002384}
[LOG] [LLM][research] complete {totalMs: 158890.10000002384, ttfbMs: 64297.10000002384, tokens: null}
[ERROR] Failed to load resource: the server responded with a status of 405 () @ /api/update-profile
```

### UI Evidence
- Screenshot: `quick_brief_test_result.png`
- Mode buttons show "Deep" (blue/selected), "Quick" and "Specific" (gray/unselected)
- User prompt contained "quick brief" keyword

---

## Root Cause Analysis

### Issue 1: Mode Detection NOT Working

**Code Path:**
1. User types: "Give me a quick brief on Stripe that I can skim before a call"
2. Frontend `inferResearchMode()` should detect "quick" keyword → return 'quick'
3. Frontend sends `research_type: 'quick'` in API request
4. Backend applies Quick mode prompt instructions

**What's Failing:**
- Frontend `inferResearchMode()` WAS fixed to detect keywords (commit d2d7247)
- But UI shows "Deep" is selected, not "Quick"
- **Hypothesis:** The fix didn't get deployed OR there's a caching issue with the Next.js build

**Evidence:**
```typescript
// ResearchChat.tsx line 367-383 (FIXED)
function inferResearchMode(prompt: string): 'deep' | 'quick' | 'specific' {
  const trimmed = prompt.trim();
  if (!trimmed) return 'deep';

  // Check for quick mode keywords
  const quickKeywords = /\b(quick|brief|summary|short|scan|skim|tldr|tl;dr|snapshot|overview)\b/i;
  if (quickKeywords.test(trimmed)) {
    return 'quick'; // Should return 'quick' for "Give me a quick brief..."
  }
  // ...
}
```

**Verification Needed:**
1. Check if Vercel deployed the latest commit (164a653)
2. Verify the deployed code actually has the keyword detection
3. Check if there's client-side caching preventing the fix from loading

---

### Issue 2: In-Memory Cache NOT Working in Vercel

**Theory:** Vercel serverless functions don't share memory between invocations

**Evidence:**
- TTFB of 64.3s suggests NO caching whatsoever
- Cache hits should be <1ms, cache miss should be 2-4s
- 64.3s indicates sequential queries happening every time

**Why In-Memory Cache Fails on Vercel:**

Vercel uses serverless functions that are:
1. **Stateless** - Each request may hit a different function instance
2. **Cold starts** - Instances are created/destroyed based on load
3. **No shared memory** - JavaScript `Map` is local to each instance

```typescript
// contextCache.ts - This Map is NOT shared across function instances
const contextCache = new Map<string, CachedUserContext>();
```

**What's Happening:**
```
Request 1 → Function Instance A → Cache empty → Load from DB (slow)
Request 2 → Function Instance B → Cache empty → Load from DB (slow)
Request 3 → Function Instance A → Cache may exist, but instance was recycled
```

**Solutions:**
1. **Use Vercel KV (Redis)** - Persistent cache shared across all instances
2. **Use Upstash Redis** - Serverless-friendly Redis
3. **Use Next.js Data Cache** - Built-in caching with revalidation
4. **Accept in-memory limitations** - Only helps on repeated requests to same instance

---

### Issue 3: Duplicate Preferences Call May Still Exist

**Fixed in commit 164a653** but if mode detection isn't working, the Quick mode prompt may not be applied.

Even with this fix, if mode is "Deep" instead of "Quick":
- Deep mode uses 'high' reasoning effort (slower)
- Deep mode prompt doesn't have the 400-600 word limit
- Deep mode allows 8 facets instead of 3 (more web searches)

---

## Fix Priority

### P0 - CRITICAL (Must fix before production)

#### 1. Verify Deployment Status
```bash
# Check latest commit deployed
curl -s https://rebar-sales-research-agent.vercel.app/ | grep -o 'page-[a-f0-9]*.js'

# Compare with local build hash
npm run build 2>&1 | grep -i hash
```

**Action:** If deployment is stale, force redeploy or clear Vercel cache

#### 2. Replace In-Memory Cache with Vercel KV

**Implementation:**
```typescript
// app/api/lib/contextCache.ts
import { kv } from '@vercel/kv';

export async function getCachedContext(userId: string): Promise<CachedUserContext | null> {
  const cached = await kv.get<CachedUserContext>(`user_context:${userId}`);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    await kv.del(`user_context:${userId}`);
    return null;
  }

  return cached;
}

export async function setCachedContext(context: CachedUserContext): Promise<void> {
  await kv.set(`user_context:${context.userId}`, context, {
    ex: Math.floor(CACHE_TTL_MS / 1000), // TTL in seconds
  });
}
```

**Setup Required:**
1. Install: `npm install @vercel/kv`
2. Create Vercel KV database in dashboard
3. Add environment variables to Vercel project
4. Redeploy

**Estimated Impact:**
- TTFB cache hit: <100ms (vs 64s)
- TTFB cache miss: 2-4s (vs 64s)
- Cache hit rate: >80% (persistent across instances)

#### 3. Fix Mode Detection (Debug)

**Actions:**
1. Add console logging to verify `research_type` sent to API:
```typescript
// ResearchChat.tsx line 2630
const requestPayload = JSON.stringify({
  messages: historyWithCurrent,
  stream: true,
  chatId: chatId ?? currentChatId,
  research_type: depth,
  // ...
});
console.log('[DEBUG] Request payload:', { research_type: depth });
```

2. Add server-side logging in chat route:
```typescript
// app/api/ai/chat/route.ts line 111
console.log('[chat] Research mode:', research_type || 'default (deep)', '| Agent type:', agentType);
console.log('[chat] Request body:', JSON.stringify({ research_type, messages: messages.slice(-1) }));
```

3. Check Vercel deployment logs for these messages

---

## Rollback Plan

If fixes take >2 hours, **ROLLBACK IMMEDIATELY**:

```bash
# Revert to commit before P0 fixes
git revert 164a653  # Duplicate preferences fix
git revert d2d7247  # Mode detection fix
git revert 40b0887  # Original P0 fixes commit (if exists)
git push origin main
```

**Expected behavior after rollback:**
- TTFB: 23-60s (original baseline)
- Sequential queries (slow but predictable)
- Mode selection: May still be broken (pre-existing issue)

---

## Success Criteria (After Fix)

✅ **Must Have:**
- [ ] TTFB <5s on cache miss
- [ ] TTFB <500ms on cache hit
- [ ] Mode detection working: "quick" → Quick mode
- [ ] Output length: 400-600 words for Quick mode
- [ ] Cache hit rate >50% (measured over 10 requests)

🎯 **Should Have:**
- [ ] TTFB <2s on cache miss
- [ ] TTFB <100ms on cache hit
- [ ] Cache hit rate >80%
- [ ] No console errors (405 on /api/update-profile)

---

## Next Steps

1. ✅ Document failure analysis (this file)
2. ⏳ Check Vercel deployment status
3. ⏳ Implement Vercel KV cache
4. ⏳ Debug mode detection with logging
5. ⏳ Test with fresh deployment
6. ⏳ Measure performance before/after

**Blocker:** Cannot proceed with production launch until TTFB <10s consistently.

---

## Additional Notes

- **405 Error on /api/update-profile**: Non-blocking but should be fixed
- **Profile Coach prompt_config update failed**: Related to 405 error
- **Reasoning stream visible**: Good UX but doesn't fix core performance issue

