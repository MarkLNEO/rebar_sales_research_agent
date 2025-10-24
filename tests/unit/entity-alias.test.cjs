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

const aliasResolverPath = resolve(__dirname, '../../lib/entities/aliasResolver.ts');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

function createSupabaseMock(aliasRows, options = {}) {
  const {
    userAliasRows = [],
    entityAliasesError = null,
    userAliasesError = null,
    onSelect,
    onUpdate,
    onInsert,
  } = options;

  return {
    from: (table) => {
      const selectResult = () => {
        if (table === 'entity_aliases') {
          return { data: aliasRows, error: entityAliasesError };
        }
        if (table === 'user_entity_aliases') {
          return { data: userAliasRows, error: userAliasesError };
        }
        return { data: [], error: null };
      };

      const chain = {
        select: () => {
          if (typeof onSelect === 'function') onSelect(table);
          return chain;
        },
        eq() {
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        maybeSingle: async () => ({ data: null, error: null }),
        update: async (payload) => {
          if (typeof onUpdate === 'function') onUpdate(table, payload);
          return { error: null };
        },
        insert: async (payload) => {
          if (typeof onInsert === 'function') onInsert(table, payload);
          return { error: null };
        },
        then: (resolve) => resolve(selectResult()),
      };
      return chain;
    },
  };
}

async function withSupabaseMock(aliasRows, optionsOrLoader, maybeLoader) {
  let options = {};
  let loader = optionsOrLoader;
  if (typeof optionsOrLoader !== 'function') {
    options = optionsOrLoader || {};
    loader = maybeLoader;
  }
  const originalLoad = Module._load;
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === '@supabase/supabase-js') {
      return {
        createClient: () => createSupabaseMock(aliasRows, options),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    try {
      const resolved = require.resolve('@supabase/supabase-js');
      if (require.cache[resolved]) {
        delete require.cache[resolved];
      }
    } catch {
      // ignore
    }
    if (require.cache[aliasResolverPath]) {
      delete require.cache[aliasResolverPath];
    }
    return await loader();
  } finally {
    Module._load = originalLoad;
  }
}

test('resolveEntity recognizes common abbreviations with high confidence', async () => {
  const aliasRows = [
    {
      id: 1,
      canonical: 'Microsoft 365',
      aliases: ['m365', 'MS365'],
      type: 'product',
      metadata: null,
      source: 'system',
    },
    {
      id: 2,
      canonical: 'Amazon Web Services',
      aliases: ['AWS'],
      type: 'platform',
      metadata: null,
      source: 'system',
    },
  ];

  const { resolveEntity, invalidateAliasCache } = await withSupabaseMock(aliasRows, async () => {
    return require(aliasResolverPath);
  });

  invalidateAliasCache();

  const shorthand = await resolveEntity('m365');
  assert.ok(shorthand, 'Expected shorthand to resolve to canonical entity');
  assert.equal(shorthand.canonical, 'Microsoft 365');
  assert.ok(shorthand.confidence >= 0.95, 'Confidence should be high for direct alias matches');

  const uppercase = await resolveEntity('MS365');
  assert.ok(uppercase, 'Case-insensitive alias should resolve');
  assert.equal(uppercase.canonical, 'Microsoft 365');

  const second = await resolveEntity('AWS');
  assert.ok(second, 'AWS alias should resolve');
  assert.equal(second.canonical, 'Amazon Web Services');

  const unknown = await resolveEntity('unknown product');
  assert.equal(unknown, null, 'Unknown terms should return null');
});

test('resolveEntity reuses cached aliases until cache is invalidated', async () => {
  const aliasRows = [
    {
      id: 1,
      canonical: 'Microsoft 365',
      aliases: ['m365', 'MS365'],
      type: 'product',
      metadata: null,
      source: 'system',
    },
  ];
  let selectCalls = 0;

  const { resolveEntity, invalidateAliasCache } = await withSupabaseMock(
    aliasRows,
    { onSelect: (table) => { if (table === 'entity_aliases') selectCalls += 1; } },
    async () => require(aliasResolverPath),
  );

  await resolveEntity('m365');
  assert.equal(selectCalls, 1, 'Initial resolution should hit database');

  await resolveEntity('MS365');
  assert.equal(selectCalls, 1, 'Cache should prevent duplicate selects');

  invalidateAliasCache();
  await resolveEntity('m365');
  assert.equal(selectCalls, 2, 'Cache invalidation should trigger reload');
});

test('learnAlias persists new aliases and invalidates cache', async () => {
  const aliasRows = [
    {
      id: 1,
      canonical: 'Amazon Web Services',
      aliases: ['AWS'],
      type: 'platform',
      metadata: null,
      source: 'system',
    },
  ];
  const insertCalls = [];

  const { resolveEntity, learnAlias, invalidateAliasCache } = await withSupabaseMock(
    aliasRows,
    {
      onInsert: (table, payload) => insertCalls.push({ table, payload }),
    },
    async () => require(aliasResolverPath),
  );

  await resolveEntity('AWS');
  assert.equal(insertCalls.length, 0, 'No insert should occur during lookup');

  await learnAlias('Amazon Web Services', 'Amazon Cloud');
  assert.equal(insertCalls.length, 1, 'learnAlias should insert when alias missing');
  assert.equal(insertCalls[0].table, 'entity_aliases');

  aliasRows[0].aliases.push('Amazon Cloud');
  invalidateAliasCache();
  const resolved = await resolveEntity('Amazon Cloud');
  assert.ok(resolved);
  assert.equal(resolved.canonical, 'Amazon Web Services');
});

test('resolveEntity surfaces database errors', async () => {
  const failingAliasRows = [];

  await assert.rejects(
    () => withSupabaseMock(
      failingAliasRows,
      { entityAliasesError: new Error('database offline') },
      async () => {
        const { resolveEntity: resolver } = require(aliasResolverPath);
        return resolver('m365');
      },
    ),
    /database offline/,
    'Expected database error to propagate'
  );
});
