# CRITICAL DISCOVERY: OpenAI Responses API Event Format

## What We Found

From the terminal logs, the **actual event structure** from OpenAI shows:

### No Delta Events
The API is **NOT** sending `response.output_text.delta` events. Instead we're seeing:
- `response.created`
- `response.in_progress`
- `response.output_item.added` - Structural event that adds output items
- `response.output_item.done` - When an output item is complete
- `response.web_search_call.*` - Web search progress

### Reasoning is Encrypted
```json
{
  "type": "response.output_item.added",
  "item": {
    "type": "reasoning",
    "encrypted_content": "gAAAAABo-RR4RDA0RVydk5y_...",
    "summary": []  // EMPTY!
  }
}
```

**Key findings:**
1. Reasoning content is **encrypted** (`encrypted_content` field)
2. The `summary` array is **empty** `[]` - no summaries being generated
3. gpt-5-mini appears to **not support streaming reasoning summaries**

### Where's the Text Content?

That's what we need to find out! The logs you showed only went up to the web search events. The actual text content must come in **later events** that we haven't seen yet.

## What I Changed

### 1. Added "Thinking" Indicator
```typescript
if (event.type === 'response.output_item.added' && event.item?.type === 'reasoning') {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: 'thinking',
    content: 'Researching and analyzing...'
  })}\n\n`));
}
```

This will show a thinking indicator when reasoning starts (you should see this already working).

### 2. Added Fallback for Non-Streaming Content
```typescript
if (event.type === 'response.done') {
  // If we didn't stream any content, extract it from final response
  if (!firstTokenReceived && event.response?.output) {
    const textOutput = event.response.output.find((item: any) => item.type === 'message');
    if (textOutput?.content) {
      // Send the complete content at once
    }
  }
}
```

If no deltas are received, we'll extract the final text from `response.done`.

### 3. Enhanced Logging
Now logs the first 10 events AND any text/delta/message events with full structure so we can see what's actually coming.

## Next Steps

1. **Clear cache and restart:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Send test query** (short one)

3. **Wait for it to complete** and check terminal for events like:
   - Event #11, #12, #13... (after the web search)
   - Look for events with `text`, `message`, or `delta` in the type
   - Check if there's a `response.message.done` or similar

4. **Share ALL the event logs** from start to finish

## Hypothesis

Based on OpenAI's Responses API behavior, I suspect:
- **Option A**: Text comes in `response.message.text.delta` events (after reasoning/search)
- **Option B**: Text is only in final `response.done` event (no streaming)
- **Option C**: Text comes in `response.output_item.added` with `type: "message"`

The enhanced logging will tell us which one is correct!
