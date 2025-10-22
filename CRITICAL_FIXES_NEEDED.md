# Critical Issues & Fixes

## ✅ FIXED: Auto-tracking every research response
**Problem**: Every research response was being automatically saved as a tracked account
**Location**: `src/page-components/ResearchChat.tsx` line 2318-2329
**Fix**: Removed automatic `ensureTrackedAccount()` call
**Status**: Fixed in code, needs dev server restart

## ⚠️ NEEDS FIX: Next.js dev server caching old code
**Problem**: Dev server logs show "Planning block exceeded threshold" warning, but that code doesn't exist anymore
**Solution**: 
1. Stop dev server (Ctrl+C)
2. Delete `.next` folder: `rm -rf .next`
3. Restart: `npm run dev`

## ⚠️ NEEDS INVESTIGATION: Jarring re-render after streaming
**Problem**: Content appears to re-render/jump after streaming completes
**Root Cause**: Two separate MessageBubble components:
- While streaming: Shows `streamingMessage` state
- After complete: Shows saved message from `messages` array
- When `setStreamingMessage('')` is called, React unmounts streaming bubble and mounts saved one
- This causes Streamdown to re-initialize, creating visual jump

**Potential Solutions**:
1. **Keep same bubble**: Don't clear `streamingMessage`, just update `messages` array
2. **Smooth transition**: Add a fade/transition between states
3. **Single source of truth**: Use only `messages` array, update last message in place during streaming

**Recommended**: Option 3 - Stream directly into the messages array instead of separate state

## ⚠️ NEEDS INVESTIGATION: No reasoning visible
**Problem**: Reasoning stream not showing during research
**Possible causes**:
1. Reasoning events not being sent by backend
2. Frontend not displaying ThinkingIndicator for reasoning
3. Reasoning collapsed/hidden by default

**Check**:
- Backend logs: Are reasoning events being sent?
- Frontend: Is ThinkingIndicator component receiving reasoning events?
- UI: Is reasoning section collapsed or hidden?

## ⚠️ NEEDS FIX: No loading indicator
**Problem**: No visual feedback while waiting for response (nearly 1 minute wait)
**Solution**: Ensure ThinkingIndicator shows immediately when request starts
**Check**: Line ~4100-4200 in ResearchChat.tsx for thinking events display logic
