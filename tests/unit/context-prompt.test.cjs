process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  esModuleInterop: true,
});
require('ts-node/register/transpile-only');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolve } = require('node:path');

const contextModulePath = resolve(__dirname, '../../app/api/lib/context.ts');

async function loadContextModule() {
  if (require.cache[contextModulePath]) {
    delete require.cache[contextModulePath];
  }
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require(contextModulePath);
}

test('buildSystemPrompt includes learned preferences and terminology for company research agent', async () => {
  const { buildSystemPrompt } = await loadContextModule();

  const context = {
    profile: {
      company_name: 'Keepit',
      industry: 'Data Protection',
      icp_definition: 'Mid-sized SaaS companies',
    },
    customCriteria: [{ field_name: 'Security certifications', importance: 'critical' }],
    signals: [
      { signal_type: 'Data breach', importance: 'critical', lookback_days: 90 },
      { signal_type: 'Leadership change', importance: 'important', lookback_days: 120 },
    ],
    disqualifiers: [],
    promptConfig: { preferred_research_type: 'quick', default_output_brevity: 'short' },
    reportPreferences: [],
    preferences: [],
    openQuestions: [],
  };

  const learnedPreferences = {
    focus: { tech_stack: { on: true } },
    coverage: { depth: 'deep', confidence: 0.92 },
    industry: {},
    summary: { brevity: 'short' },
    tone: 'direct',
  };

  const termMappings = [
    { term: 'AWS', expansion: 'Amazon Web Services', context: 'cloud providers' },
  ];

  const prompt = await buildSystemPrompt(context, 'company_research', learnedPreferences, termMappings);

  assert.match(prompt, /LEARNED USER PREFERENCES/i);
  assert.match(prompt, /Research Depth: DEEP/);
  assert.match(prompt, /Amazon Web Services/);
  assert.match(prompt, /Mid-sized SaaS companies/);
  assert.match(prompt, /Data breach/i);
});

test('buildSystemPrompt emits profile coach instructions for settings agent', async () => {
  const { buildSystemPrompt } = await loadContextModule();

  const context = {
    profile: { company_name: 'Keepit', icp_definition: '' },
    customCriteria: [],
    signals: [],
    disqualifiers: [],
    promptConfig: {},
    reportPreferences: [],
    preferences: [],
    openQuestions: [],
  };

  const prompt = await buildSystemPrompt(context, 'settings_agent', null, []);
  assert.match(prompt, /You are a Profile Coach/i);
  assert.match(prompt, /JSON block/);
});
