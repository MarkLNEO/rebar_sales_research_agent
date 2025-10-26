# Profile Update Issues Analysis

**Date:** October 22, 2025
**Status:** ✅ Fixed - Endpoint URL corrected

---

## User-Reported Issues

You reported three related issues:

1. **Profile update failed (405 error)**
2. **Why is profile update happening during research?**
3. **Streaming response felt like it came all at once** (possibly blocked by profile update?)

Let me address each:

---

## Issue 1: Profile Update Failed (405 Error)

### Root Cause
The frontend was calling `/api/update-profile`, but the actual endpoint is `/api/profiles/update`.

### Evidence
From your screenshot:
```
Name: update-profile
Request Payload:
{
  prompt_config: {research_count: 6}
  research_count: 6
}
```

Console error:
```
[ERROR] Failed to load resource: the server responded with a status of 405 ()
[WARNING] [ProfileCoach] prompt_config update failed: Failed with status 405
```

### Why 405 (Method Not Allowed)?
When you call a non-existent route in Next.js, the default handler returns 405. The route `/api/update-profile` doesn't exist - the correct route is `/api/profiles/update/route.ts`.

### Fix Applied
Changed all 10 occurrences across 4 files:
- [ResearchChat.tsx:2350](src/page-components/ResearchChat.tsx:2350) (6 occurrences)
- [CompanyProfile.tsx:635](src/page-components/CompanyProfile.tsx:635) (2 occurrences)
- [OnboardingEnhanced.tsx:876](src/page-components/OnboardingEnhanced.tsx:876) (1 occurrence)
- [SaveSignatureDialog.tsx:58](src/components/SaveSignatureDialog.tsx:58) (1 occurrence)

All now call `/api/profiles/update` correctly.

---

## Issue 2: Why Profile Update During Research?

### The Reasoning
The profile update you saw is **research count tracking** for "Just-In-Time (JIT) prompts based on usage milestones."

### Code Location
[ResearchChat.tsx:2336-2373](src/page-components/ResearchChat.tsx:2336-2373)

```typescript
// JIT prompts based on usage milestones and profile state
try {
  // Increment research count (local + server)
  const key = 'research_count';
  const current = Number(localStorage.getItem(key) || '0') || 0;
  const next = current + 1;  // You were on research #6
  localStorage.setItem(key, String(next));

  // Persist in user_prompt_config (best-effort)
  const profileUpdate = await fetch('/api/profiles/update', {  // Fixed!
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionResult.data.session?.access_token}`,
    },
    body: JSON.stringify({ prompt_config: { research_count: next } })
  });
}
```

### Purpose of Research Count
The system tracks how many research queries you've run to trigger contextual prompts:

- **After 1st research:** "Would you like to track this account?"
- **After 3rd research:** "Want to set up bulk research?"
- **After 5th research:** "Ready to configure custom criteria?"

This creates a progressive onboarding experience without overwhelming new users.

### Your Case
You were on your 6th research request, so the system tried to update `research_count: 6` in your profile. This failed due to the wrong endpoint URL.

---

## Issue 3: Streaming Felt Like It Came All At Once

### Investigation Result: **Not Caused by Profile Update**

The profile update happens AFTER the streaming completes, not during.

### Code Flow
```typescript
// Line 2259: Start streaming (ASYNC - doesn't block)
let assistant = await streamAIResponse(text, chatId, { overrideDepth: runModeOverride });

// Lines 2260-2335: Process completed response
// - Strip clarifier blocks
// - Save to database
// - Update chat title
// - Set action bar

// Lines 2336-2373: Update research count (THIS IS AFTER STREAM COMPLETES)
try {
  const profileUpdate = await fetch('/api/profiles/update', { ... });
}
```

The `await streamAIResponse(...)` call on line 2259 **waits for the entire stream to finish** before continuing. So the profile update at line 2350 happens AFTER you've already seen the full response.

### Possible Causes of "All at Once" Feeling

If streaming felt chunky or delayed, it could be:

#### 1. **Browser Buffering**
Some browsers buffer Server-Sent Events (SSE) before displaying them. Chrome DevTools can sometimes cause this.

**Solution:** Test in incognito mode or check if DevTools is affecting it.

#### 2. **Reasoning Stream Batching**
We intentionally batch reasoning updates every 100ms to avoid re-rendering on every character:

```typescript
// Lines 2821-2837
// Debounce UI updates to every 100ms instead of per-character
if (reasoningFlushTimerRef.current) {
  clearTimeout(reasoningFlushTimerRef.current);
}

reasoningFlushTimerRef.current = setTimeout(() => {
  const buffered = reasoningBufferRef.current || '';
  if (buffered) {
    setThinkingEvents(prev => { /* update UI */ });
  }
}, 100); // Update UI max every 100ms
```

This is intentional to prevent hundreds of re-renders, but it means reasoning appears in 100ms chunks, not character-by-character.

#### 3. **Network Latency Burst**
If you have high latency or packet loss, multiple chunks might arrive together after a delay, making it feel "all at once."

**Check:** Look at the Network tab waterfall to see if chunks are arriving in bursts.

#### 4. **Backend Reasoning Time**
OpenAI's Responses API generates reasoning BEFORE streaming content. With `reasoning.effort: 'high'`, this can take 10-20 seconds, during which nothing streams.

**Example Timeline:**
- 0-15s: Backend thinking (no content yet)
- 15-16s: Reasoning streams
- 16-50s: Content streams smoothly

If you only noticed streaming at 16s, it might feel "late" even though the backend was working the whole time.

---

## Issue 4: /api/ai/chat Not Showing in Network Tab

### Possible Causes

#### 1. **Request is There But Filtered**
Chrome DevTools filters can hide requests. Check:
- Filter box at top of Network tab (clear it)
- "Fetch/XHR" filter (should be checked)
- "All" tab (not just "Doc", "CSS", etc.)

#### 2. **Request Name Changed**
The request IS `/api/ai/chat`, so it should appear. But if you're filtering by a different name, you might miss it.

#### 3. **Service Worker Interference**
If there's a service worker caching the response, it might not show up in Network tab the same way.

**Check:** Open DevTools → Application → Service Workers → See if any are active

#### 4. **Streaming Responses Don't Always Show Size**
SSE streaming responses often show:
- **Type:** `eventsource` or `xhr`
- **Size:** `(pending)` or `(streaming)`
- **Time:** Very long (while stream is open)

Look for a request that's open for 60+ seconds with `(pending)` size.

### To Debug

1. **Clear all filters** in Network tab
2. **Look for long-running requests** (60-180s duration)
3. **Check the Payload tab** to see the request body
4. **Look for Status 200** with no file size (indicates streaming)

---

## Summary

| Issue | Root Cause | Fixed? | Notes |
|-------|-----------|--------|-------|
| **405 error on profile update** | Wrong endpoint URL (`/api/update-profile` → `/api/profiles/update`) | ✅ Yes | Deployed in commit d42b7b9 |
| **Why profile update happens** | Research count tracking for JIT prompts | ℹ️ Explained | Updates after research completes, not during |
| **Streaming felt all at once** | Not caused by profile update | ❓ Investigate | Could be browser buffering, network, or reasoning delay |
| **/api/ai/chat not in Network** | Likely filtered or streaming response display | ❓ Check | Request should be there, check filters |

---

## Testing Instructions

After this fix deploys:

### 1. Verify Profile Update Works
1. Open DevTools → Network tab
2. Run a research query
3. Wait for completion
4. Look for `/api/profiles/update` with Status 200 (not 405)
5. Check Console - should NOT see "prompt_config update failed"

### 2. Verify Research Count Increments
1. Check localStorage: `localStorage.getItem('research_count')`
2. Should increment after each research
3. Check database: `user_profiles.prompt_config.research_count`

### 3. Debug Streaming (If Still Feels Chunky)
1. Open Network tab → `/api/ai/chat`
2. Click on request → "EventStream" tab
3. Watch events arrive in real-time
4. Note timestamps - are they smooth or bursty?

### 4. Find /api/ai/chat in Network
1. Clear all filters in Network tab
2. Run research
3. Sort by Duration (longest first)
4. Look for request taking 60-180 seconds
5. It might show as `(pending)` or `eventsource` type

---

## Next Steps

✅ **Completed:**
- Fixed endpoint URLs across entire codebase
- Deployed to production

📊 **Monitor:**
- Check Vercel logs for successful profile updates
- Verify research_count increments correctly
- Watch for any remaining 405 errors

🔍 **Investigate Further (If Issues Persist):**
- Capture HAR file showing streaming behavior
- Check browser console for SSE buffering warnings
- Test in different browsers (Chrome vs Firefox vs Safari)
- Measure actual chunk arrival times in Network waterfall

---

## Additional Context

**Why "research_count" Matters:**
The system uses this metric to progressively reveal features:
- Prevents overwhelming new users with all features at once
- Surfaces advanced features when user is ready
- Enables smart defaults based on usage patterns

**Example JIT Prompts:**
```typescript
// After 1st research: suggest tracking account if none tracked
if (next === 1) {
  const { count } = await supabase
    .from('tracked_accounts')
    .select('*', { count: 'exact', head: true });
  if (count === 0) {
    // Show: "Want to track this account for updates?"
  }
}
```

This creates a "learn by doing" experience rather than front-loading configuration.

---

## Questions?

If streaming still feels chunky after this fix, let me know and I can:
1. Add more detailed timing logs
2. Capture SSE event timestamps
3. Check if backend reasoning is taking too long
4. Investigate browser-specific buffering issues

