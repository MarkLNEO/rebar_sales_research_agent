process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  esModuleInterop: true,
});
require('ts-node/register/transpile-only');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolve } = require('node:path');
const Module = require('module');

const routeModulePath = resolve(__dirname, '../../app/api/ai/chat/route.ts');
const researchOutputPath = resolve(__dirname, '../../src/utils/researchOutput.ts');

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';

function withMockedModules(mocks, loader) {
  const originalLoad = Module._load;
  Module._load = function mockLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const cleanup = () => {
    Module._load = originalLoad;
  };

  const run = async () => {
    try {
      return await loader();
    } finally {
      cleanup();
    }
  };

  return run();
}

async function loadResearchOutputModule() {
  if (require.cache[researchOutputPath]) {
    delete require.cache[researchOutputPath];
  }
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require(researchOutputPath);
}

async function setupChatRouteTest(options = {}) {
  const capturedCalls = [];
  const deductCalls = [];
  const usageCalls = [];
  const streamEvents = options.streamEvents ?? [
    { type: 'response.output_text.delta', delta: 'Sample content chunk' },
    { type: 'response.done', response: { usage: { total_tokens: 120 }, output: [] } },
  ];

  const authOverrides = options.authOverrides || {};
  const contextOverride = options.contextOverride || {};
  const openaiOverride = options.openaiOverrides || {};

  const authenticateRequestImpl =
    authOverrides.authenticateRequest ||
    (async () => ({
      user: authOverrides.user || { id: 'user-123' },
      supabase: authOverrides.supabase || {},
    }));

  const checkCreditsImpl =
    authOverrides.checkCredits ||
    (async () => ({ remaining: 500, lowCredits: false }));

  const deductCreditsImpl = async (...args) => {
    deductCalls.push(args);
    if (typeof authOverrides.deductCredits === 'function') {
      return authOverrides.deductCredits(...args);
    }
    return undefined;
  };

  const logUsageImpl = async (...args) => {
    usageCalls.push(args);
    if (typeof authOverrides.logUsage === 'function') {
      return authOverrides.logUsage(...args);
    }
    return undefined;
  };

  const MockOpenAI = class {
    constructor() {
      this.responses = {
        stream: async (callOptions) => {
          capturedCalls.push(callOptions);
          if (typeof openaiOverride.onStreamCall === 'function') {
            openaiOverride.onStreamCall(callOptions);
          }
          return {
            async *[Symbol.asyncIterator]() {
              for (const event of streamEvents) {
                yield event;
              }
            },
          };
        },
      };
    }
  };
  MockOpenAI.default = MockOpenAI;
  MockOpenAI.__esModule = true;

  const mocks = {
    '../../lib/auth': {
      authenticateRequest: authenticateRequestImpl,
      checkCredits: checkCreditsImpl,
      deductCredits: deductCreditsImpl,
      logUsage: logUsageImpl,
    },
    '../../lib/contextLoader': {
      loadFullUserContext: async () => ({
        userId: 'user-123',
        profile: { company_name: 'Keepit' },
        customCriteria: [],
        signals: [],
        disqualifiers: [],
        promptConfig: null,
        reportPreferences: [],
        preferences: [],
        openQuestions: [],
        learnedPreferences: null,
        termMappings: [],
        memoryBlock: contextOverride.memoryBlock ?? '',
        systemPrompt: contextOverride.systemPrompt ?? 'SYSTEM PROMPT',
        customTerminology: contextOverride.customTerminology ?? '(No custom terminology configured)',
      }),
    },
    openai: MockOpenAI,
  };

  const routeRequirePaths = [resolve(__dirname, '../../app/api/ai/chat')];

  for (const key of Object.keys(mocks)) {
    if (key.startsWith('.')) {
      try {
        const resolved = require.resolve(key, { paths: routeRequirePaths });
        if (require.cache[resolved]) {
          delete require.cache[resolved];
        }
      } catch {
        // ignore if module was never loaded
      }
    } else {
      try {
        const resolved = require.resolve(key);
        if (require.cache[resolved]) {
          delete require.cache[resolved];
        }
      } catch {
        // Module might not exist yet; ignore.
      }
    }
  }
  if (require.cache[routeModulePath]) {
    delete require.cache[routeModulePath];
  }

  const { POST } = await withMockedModules(mocks, async () => {
    return require(routeModulePath);
  });

  return {
    POST,
    capturedCalls,
    deductCalls,
    usageCalls,
  };
}

function createRequest(body) {
  const headers = new Headers();
  headers.set('authorization', 'Bearer test-token');
  return {
    headers,
    json: async () => body,
  };
}

async function readSseEvents(response) {
  const events = [];
  const reader = response.body?.getReader();
  if (!reader) return events;
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let splitIndex;
    while ((splitIndex = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, splitIndex).trim();
      buffer = buffer.slice(splitIndex + 2);
      if (!rawEvent.startsWith('data:')) continue;
      const payload = rawEvent.slice(5).trim();
      if (!payload) continue;
      events.push(JSON.parse(payload));
      if (payload.includes('"type":"done"')) {
        reader.releaseLock();
        return events;
      }
    }
  }

  reader.releaseLock();
  return events;
}

test('follow-up requests include recent conversation history and preserved terminology', async () => {
  const setup = await setupChatRouteTest({
    contextOverride: {
      customTerminology: 'Data breach\nLeadership change',
    },
  });

  const body = {
    messages: [
      { role: 'user', content: 'Research Gartner' },
      { role: 'assistant', content: 'Gartner is a global research and advisory firm with strong enterprise focus.' },
      { role: 'user', content: 'Tell me about their CEO' },
    ],
    chatId: 'chat-1',
    agentType: 'company_research',
    is_follow_up: true,
  };

  const response = await setup.POST(createRequest(body));
  const events = await readSseEvents(response);
  const call = setup.capturedCalls[0];
  assert.ok(call, 'Expected OpenAI stream call to be captured');

  assert.ok(!Object.prototype.hasOwnProperty.call(call, 'reasoning'), 'Follow-up requests should omit reasoning config');

  assert.ok(call.input.includes('Research Gartner'), 'Conversation history should include initial research');
  assert.ok(call.input.includes('Tell me about their CEO'), 'Final question should be appended at the end');
  assert.ok(call.input.includes('## Recent Conversation History'), 'Conversation history header missing');
  assert.ok(call.instructions.includes('follow-up question'), 'Follow-up prompt should use lightweight instructions');
  assert.ok(call.instructions.includes('Data breach'), 'Custom terminology must be preserved in prompt');
  assert.ok(call.instructions.includes('Leadership change'), 'All configured terminology should be present');

  assert.ok(events.length > 0, 'Expected streamed events to be emitted');
  assert.equal(events[0].type, 'status');
  assert.equal(events[0].content, 'Analyzing your question...');

  const doneEvent = events.find(event => event.type === 'done');
  assert.ok(doneEvent, 'Expected done event to be emitted');
  assert.equal(setup.usageCalls.length, 1, 'Usage should be logged once per request');
  assert.equal(setup.deductCalls.length, 1, 'Credits should be deducted once per request');
});

test('new research requests stream status updates and include memory block', async () => {
  const setup = await setupChatRouteTest({
    contextOverride: {
      memoryBlock: '<<memory v=1 agent=company_research>>\n- Prefers leadership coverage\n</memory>',
    },
  });

  const body = {
    messages: [
      { role: 'user', content: 'Research Microsoft' },
    ],
    chatId: 'chat-2',
    agentType: 'company_research',
    is_follow_up: false,
  };

  const response = await setup.POST(createRequest(body));
  const events = await readSseEvents(response);
  const call = setup.capturedCalls[0];
  assert.ok(call, 'Expected OpenAI stream call to be captured');

  assert.ok(call.reasoning && call.reasoning.effort === 'low', 'New research should request low reasoning effort');

  assert.equal(call.input.trim(), 'Research Microsoft', 'Initial research should not prepend conversation history');
  assert.ok(call.instructions.includes('SYSTEM PROMPT'), 'System prompt must be included for new research');
  assert.ok(call.instructions.includes('<<memory v=1 agent=company_research>>'), 'Memory block should be appended to instructions');
  assert.ok(events.length > 0, 'Expected streamed events to be emitted');
  assert.equal(events[0].type, 'status');
  assert.equal(events[0].content, 'Researching company...');
});

test('returns 400 when no user message is present', async () => {
  const setup = await setupChatRouteTest();

  const body = {
    messages: [
      { role: 'assistant', content: 'Hello there!' },
    ],
    chatId: 'chat-missing-user',
    agentType: 'company_research',
  };

  const response = await setup.POST(createRequest(body));
  assert.equal(response.status, 400);
  assert.equal(setup.capturedCalls.length, 0, 'OpenAI should not be invoked when user message is missing');
  const payload = await response.json();
  assert.match(payload.error, /No user message/);
});

test('fails fast when credits are exhausted', async () => {
  const setup = await setupChatRouteTest({
    authOverrides: {
      checkCredits: async () => { throw new Error('Credits exhausted'); },
    },
  });

  const body = {
    messages: [
      { role: 'user', content: 'Research Okta' },
    ],
    chatId: 'chat-no-credits',
    agentType: 'company_research',
  };

  const response = await setup.POST(createRequest(body));
  assert.equal(response.status, 500);
  assert.equal(setup.capturedCalls.length, 0, 'OpenAI should not be invoked when credits fail');
  const payload = await response.json();
  assert.match(payload.error, /Credits exhausted/);
});

test('emits web search metadata events when tool usage occurs', async () => {
  const streamEvents = [
    {
      type: 'response.tool_use.started',
      tool_use: { type: 'web_search', query: 'Oracle competitors' },
    },
    {
      type: 'response.tool_use.completed',
      tool_use: {
        type: 'web_search',
        query: 'Oracle competitors',
        result: { results: [{ url: 'https://example.com/a' }, { url: 'https://example.com/b' }] },
      },
    },
    { type: 'response.done', response: { usage: { total_tokens: 12 }, output: [] } },
  ];

  const setup = await setupChatRouteTest({ streamEvents });

  const body = {
    messages: [
      { role: 'user', content: 'Research Oracle' },
      { role: 'user', content: 'Who are their competitors?' },
    ],
    chatId: 'chat-web-search',
    agentType: 'company_research',
    is_follow_up: true,
  };

  const response = await setup.POST(createRequest(body));
  const events = await readSseEvents(response);
  const webSearchEvents = events.filter(event => event.type === 'web_search');
  assert.ok(webSearchEvents.length >= 2, 'Expected web search events to be emitted');
  const completed = webSearchEvents.find(event => event.sources);
  assert.ok(completed, 'Completed web search event should include sources');
  assert.deepEqual(completed.sources, ['https://example.com/a', 'https://example.com/b']);
});

test('streamed response content feeds into research draft builder', async () => {
  const streamEvents = [
    {
      type: 'response.output_text.delta',
      delta: '# Research Summary: Oracle\n\n## Signals\nData breach - None reported\n',
    },
    {
      type: 'response.output_text.delta',
      delta: '## Decision Makers\n- Jane Doe — CTO\n',
    },
    { type: 'response.done', response: { usage: { total_tokens: 64 }, output: [] } },
  ];

  const setup = await setupChatRouteTest({ streamEvents });

  const body = {
    messages: [
      { role: 'user', content: 'Research Oracle' },
    ],
    chatId: 'chat-draft',
    agentType: 'company_research',
  };

  const response = await setup.POST(createRequest(body));
  const events = await readSseEvents(response);
  const content = events
    .filter(event => event.type === 'content')
    .map(event => event.content)
    .join('');

  const { buildResearchDraft } = await loadResearchOutputModule();
  const draft = buildResearchDraft({
    assistantMessage: content,
    userMessage: 'Research Oracle',
    agentType: 'company_research',
    sources: [{ url: 'https://example.com/oracle' }],
  });

  assert.ok(/Oracle/i.test(draft.subject));
  assert.equal(draft.research_type, 'company');
  assert.ok(draft.markdown_report.includes('Decision Makers'));
  assert.equal(draft.sources.length, 1);
});
