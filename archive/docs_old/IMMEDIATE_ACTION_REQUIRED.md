# Immediate Action Required

## 🚨 CRITICAL: Next.js is running OLD CODE

Your dev server is running **cached/stale code**. The log shows:
```
[chat] Planning block exceeded threshold without delimiter, streaming remainder as content
```

**This code doesn't exist anymore** - we deleted it. Next.js is serving cached code from `.next/` folder.

### Fix NOW:
```bash
# 1. Stop dev server (Ctrl+C)
# 2. Delete cache
rm -rf .next
# 3. Restart
npm run dev
```

## ✅ Fixed in Code (needs restart to take effect):

### 1. Auto-tracking bug
- **Fixed**: Removed automatic `ensureTrackedAccount()` call
- **File**: `src/page-components/ResearchChat.tsx` line 2317
- **Impact**: Will stop saving every research response as a tracked account

### 2. Removed planning block extraction
- **Fixed**: Removed all buffering and regex extraction logic
- **File**: `app/api/ai/chat/route.ts` lines 69-71, 183-194
- **Impact**: Content streams directly, no more delays or stuck buffers

### 3. Simplified prompt
- **Fixed**: Removed Planning, Purpose, Progress update instructions
- **File**: `app/api/lib/context.ts` lines 157-197
- **Impact**: Cleaner output, no more jarring content in final response

### 4. Fixed undefined custom criteria
- **Fixed**: Filter out criteria with undefined names
- **File**: `app/api/lib/context.ts` line 379
- **Impact**: No more "undefined (critical)" in output

## ⚠️ Still Need to Investigate (after restart):

### 1. Jarring re-render issue
**Problem**: Content jumps/re-renders after streaming completes

**Root cause**: Two separate MessageBubble components:
- Streaming: Uses `streamingMessage` state
- Complete: Uses `messages` array
- When streaming ends, React unmounts one and mounts the other
- Streamdown re-initializes, causing visual jump

**Potential fix**: Stream directly into messages array instead of separate state
**Location**: `src/page-components/ResearchChat.tsx` around line 2282-2290

### 2. No reasoning visible
**Status**: Code is correct, reasoning events ARE being captured
**Possible issues**:
- Backend not sending reasoning events (check after restart)
- Reasoning hidden in UI (check `showInlineReasoning` localStorage)
- Reasoning events being cleared too quickly

**Debug steps after restart**:
1. Open browser console
2. Run research query
3. Check for `type: 'reasoning'` in network tab (SSE events)
4. Check if `thinkingEvents` state has reasoning items

### 3. No loading indicator
**Status**: ThinkingIndicator should show automatically
**Check**: Lines 4090-4153 in ResearchChat.tsx
**Possible issue**: `thinkingEvents` array is empty during wait

## Next Steps:

1. **RESTART DEV SERVER** with cache clear (see commands above)
2. **Test a research query**
3. **Check browser console** for any errors
4. **Report back** what you see:
   - Does reasoning appear?
   - Is there a loading indicator?
   - Does auto-tracking still happen?
   - Is the re-render still jarring?
