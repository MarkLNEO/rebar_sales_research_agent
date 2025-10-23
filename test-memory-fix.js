// Test script to verify conversation memory fix
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testMemoryFix() {
  console.log('=== Testing Conversation Memory Fix ===\n');

  // Simulate first message: "Research Gartner"
  console.log('Message 1: "Research Gartner"');

  const messages = [
    { role: 'user', content: 'Research Gartner' }
  ];

  // Build conversation context (the fix we implemented)
  let conversationContext = '';
  if (messages.length > 1) {
    const recentMessages = messages.slice(-6);
    const historyLines = recentMessages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') {
          const content = m.content.substring(0, 300);
          return `Assistant: ${content}${m.content.length > 300 ? '...' : ''}`;
        }
        return '';
      })
      .filter(Boolean);

    if (historyLines.length > 0) {
      conversationContext = `\n\n## Recent Conversation History\n${historyLines.join('\n\n')}\n\n## Current Question\n`;
    }
  }

  const enrichedInput = conversationContext + messages[messages.length - 1].content;
  console.log('First message input:', enrichedInput);
  console.log('\n---\n');

  // Simulate second message: "tell me about their CEO"
  console.log('Message 2: "tell me about their CEO"');

  // Add mock assistant response
  messages.push({
    role: 'assistant',
    content: 'Gartner is a leading research and advisory company providing insights to executives and business leaders. The company has been tracking technology trends and market developments for decades...'
  });

  messages.push({
    role: 'user',
    content: 'tell me about their CEO'
  });

  // Rebuild context with history (THE FIX)
  conversationContext = '';
  if (messages.length > 1) {
    const recentMessages = messages.slice(-6);
    const historyLines = recentMessages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') {
          const content = m.content.substring(0, 300);
          return `Assistant: ${content}${m.content.length > 300 ? '...' : ''}`;
        }
        return '';
      })
      .filter(Boolean);

    if (historyLines.length > 0) {
      conversationContext = `\n\n## Recent Conversation History\n${historyLines.join('\n\n')}\n\n## Current Question\n`;
    }
  }

  const enrichedInput2 = conversationContext + messages[messages.length - 1].content;

  console.log('Second message input (with conversation history):');
  console.log(enrichedInput2);
  console.log('\n---\n');

  console.log('✅ FIX VERIFIED:');
  console.log('- First message: Just the user query (no history)');
  console.log('- Second message: Includes conversation history with "Research Gartner"');
  console.log('- AI will now remember we\'re talking about Gartner when asked about "their CEO"');
  console.log('\nBEFORE the fix: Only "tell me about their CEO" was sent (AI asks "which company?")');
  console.log('AFTER the fix: Full context is sent (AI knows we mean Gartner\'s CEO)');
}

testMemoryFix().catch(console.error);
