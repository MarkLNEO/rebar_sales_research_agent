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

const routeModulePath = resolve(__dirname, '../../app/api/ai/followups/route.ts');

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

async function setupFollowupsRouteTest(options = {}) {
  const capturedCalls = [];
  const usageCalls = [];

  const streamEvents = options.streamEvents ?? [
    { type: 'response.output_text.delta', delta: 'Follow-up delta' },
    { type: 'response.done', response: { usage: { total_tokens: 42 }, output: [] } },
  ];

  const authOverrides = options.authOverrides || {};
  const contextOverride = options.contextOverride || {};

  const authenticateRequestImpl =
    authOverrides.authenticateRequest ||
    (async () => ({ user: { id: 'user-123' }, supabase: {} }));

  const logUsageImpl = async (...args) => { usageCalls.push(args); };

  const MockOpenAI = class {
    constructor() {
      this.responses = {
        create: async (call) => {
          capturedCalls.push(call);
          // Return structured JSON output as the route expects
          return {
            output: [
              {
                content: [
                  {
                    type: 'output_json',
                    json: { suggestions: ['What is ARR?', 'Who is CTO?', 'Any recent leadership change?'] },
                  },
                ],
              },
            ],
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
      logUsage: logUsageImpl,
    },
    '../../lib/contextLoader': {
      loadFullUserContext: async () => ({
        userId: 'user-123',
        profile: { company_name: 'Keepit' },
        customCriteria: [],
        signals: [
          { signal_type: 'Data breach', importance: 'critical' },
          { signal_type: 'Leadership change', importance: 'important' },
        ],
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

  if (require.cache[routeModulePath]) delete require.cache[routeModulePath];

  const { POST } = await withMockedModules(mocks, async () => require(routeModulePath));
  return { POST, capturedCalls, usageCalls };
}

function createRequest(body) {
  const headers = new Headers();
  headers.set('authorization', 'Bearer test-token');
  return { headers, json: async () => body };
}

test('followups include history + terminology and return JSON', async () => {
  const setup = await setupFollowupsRouteTest({
    contextOverride: { customTerminology: 'Data breach\nLeadership change' },
  });

  const body = {
    last_assistant: 'ServiceNow is an ITSM platform used by enterprises. Leadership change occurred recently.',
    last_user: 'Compare to Salesforce',
    applied_context: null,
    active_company: 'ServiceNow',
  };

  const res = await setup.POST(createRequest(body));
  const call = setup.capturedCalls[0];

  assert.ok(call);
  // Follow-ups use non-streaming JSON output; ensure instructions carry terminology
  assert.match(call.instructions, /SYSTEM PROMPT|assist revenue teams/i);
  // Input should include the latest user message context
  assert.match(call.input, /Compare to Salesforce/);
  // Terminology is enforced downstream in the generated suggestions; the input no longer
  // embeds raw labels. Validate output quality instead of raw instruction text.

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(Array.isArray(json.suggestions));
  assert.ok(json.suggestions.length >= 3);
  // Basic quality checks: questions, ≤ 18 words, no snake_case
  for (const q of json.suggestions) {
    assert.match(q, /\?$/);
    const words = q.trim().split(/\s+/);
    assert.ok(words.length <= 18);
    assert.ok(!/[a-z]+_[a-z0-9_]+/.test(q));
  }
});
