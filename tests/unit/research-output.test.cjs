process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  esModuleInterop: true,
});
require('ts-node/register/transpile-only');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolve } = require('node:path');

const researchOutputPath = resolve(__dirname, '../../src/utils/researchOutput.ts');

test('applyIndicatorTerminology injects configured signals with exact terminology', async () => {
  if (require.cache[researchOutputPath]) {
    delete require.cache[researchOutputPath];
  }
  const { applyIndicatorTerminology } = require(researchOutputPath);

  const baseMarkdown = [
    '## Signals',
    '- Legacy signal that should remain',
    '',
    '## Competitive Analysis',
    '- Market leader in cloud storage',
  ].join('\n');

  const profile = {
    indicator_choices: ['Data breach', 'Leadership change', 'Acquisition'],
  };

  const enhanced = applyIndicatorTerminology(baseMarkdown, profile);

  for (const signal of profile.indicator_choices) {
    assert.ok(
      enhanced.includes(`- ${signal}`),
      `Missing exact indicator phrasing for "${signal}"`
    );
  }

  const dataBreachIndex = enhanced.indexOf('- Data breach');
  const legacyIndex = enhanced.indexOf('- Legacy signal that should remain');
  assert.ok(
    dataBreachIndex !== -1 && legacyIndex !== -1 && dataBreachIndex < legacyIndex,
    'Configured indicators should appear before legacy content'
  );

  assert.ok(
    enhanced.includes('## Competitive Analysis'),
    'Unrelated sections must remain untouched'
  );
});

test('applyIndicatorTerminology creates signals section when none exists', async () => {
  if (require.cache[researchOutputPath]) {
    delete require.cache[researchOutputPath];
  }
  const { applyIndicatorTerminology } = require(researchOutputPath);

  const baseMarkdown = [
    '## Executive Summary',
    'Key insights go here.',
  ].join('\n');

  const profile = {
    indicator_choices: ['Leadership change', 'Acquisition'],
  };

  const enhanced = applyIndicatorTerminology(baseMarkdown, profile);
  assert.ok(/##\s+(Indicators|Signals)/.test(enhanced), 'Indicators heading should be appended when missing');
  assert.ok(enhanced.includes('- Leadership change'));
  assert.ok(enhanced.includes('- Acquisition'));
});

test('extractDecisionMakerContacts surfaces contacts matching target titles', async () => {
  if (require.cache[researchOutputPath]) {
    delete require.cache[researchOutputPath];
  }
  const { extractDecisionMakerContacts } = require(researchOutputPath);

  const markdown = [
    '- Marc Benioff — CEO',
    '- Scott Guthrie — CTO',
    '- Jane Doe — VP Security Operations',
    '- Alex Smith — Head of HR',
  ].join('\n');

  const contacts = extractDecisionMakerContacts(markdown, 6, ['CISO', 'CTO', 'VP Security']);
  assert.ok(contacts.length >= 2, 'Expected at least two contacts to be extracted');

  const cto = contacts.find(contact => contact.title.toLowerCase().includes('cto'));
  assert.ok(cto);
  assert.equal(cto?.name, 'Scott Guthrie');

  const vpSecurity = contacts.find(contact => contact.title.toLowerCase().includes('vp security'));
  assert.ok(vpSecurity);
  assert.equal(vpSecurity?.name, 'Jane Doe');
});

test('extractDecisionMakerContacts respects max limit and filters non-target roles', async () => {
  if (require.cache[researchOutputPath]) {
    delete require.cache[researchOutputPath];
  }
  const { extractDecisionMakerContacts } = require(researchOutputPath);

  const markdown = [
    '- Scott Guthrie — CTO',
    '- Jane Doe — VP Security Operations',
    '- Alex Smith — Head of HR',
  ].join('\n');

  const contacts = extractDecisionMakerContacts(markdown, 2, ['CTO', 'VP Security']);
  assert.equal(contacts.length, 2, 'Max parameter should cap results');
  const roles = contacts.map(contact => contact.title.toLowerCase());
  assert.ok(roles.some(role => role.includes('cto')));
  assert.ok(roles.some(role => role.includes('vp security')));
  assert.ok(!roles.some(role => role.includes('hr')));
});
