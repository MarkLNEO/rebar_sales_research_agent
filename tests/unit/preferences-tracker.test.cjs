process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  esModuleInterop: true,
});
require('ts-node/register/transpile-only');

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolve } = require('node:path');

const trackerModulePath = resolve(__dirname, '../../lib/preferences/tracker.ts');

function setupBrowserMocks({ token = 'AUTH_TOKEN', fetchImpl } = {}) {
  const original = {
    fetch: global.fetch,
    window: global.window,
    localStorage: global.localStorage,
  };

  const fetchCalls = [];
  global.fetch = async (input, init) => {
    fetchCalls.push({ input, init });
    if (typeof fetchImpl === 'function') {
      return fetchImpl(input, init, fetchCalls.length);
    }
    return { ok: true };
  };

  const storage = new Map();
  if (token) {
    storage.set('supabase.auth.token', JSON.stringify({ access_token: token }));
  }

  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => { storage.set(key, value); },
    removeItem: (key) => { storage.delete(key); },
  };

  global.window = { localStorage };
  global.localStorage = localStorage;

  return {
    fetchCalls,
    storage,
    restore() {
      if (original.fetch) global.fetch = original.fetch; else delete global.fetch;
      if (original.window) global.window = original.window; else delete global.window;
      if (original.localStorage) global.localStorage = original.localStorage; else delete global.localStorage;
    },
  };
}

async function loadTracker() {
  if (require.cache[trackerModulePath]) {
    delete require.cache[trackerModulePath];
  }

  const Module = require('module');
  const originalLoad = Module._load;
  Module._load = function mockLoad(request, parent, isMain) {
    // Intercept supabase client import used by tracker to avoid env deps
    if (request.includes('src/lib/supabase') || request.endsWith('/src/lib/supabase') || request === '../../src/lib/supabase') {
      return {
        supabase: {
          auth: {
            async getSession() {
              // Simulate no session so tracker falls back to localStorage
              return { data: { session: null } };
            },
          },
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(trackerModulePath).preferenceTracker;
  } finally {
    Module._load = originalLoad;
  }
}

test('preference tracker persists repeated follow-up topics as implicit preferences', async () => {
  const preferenceTracker = await loadTracker();
  const { fetchCalls, restore } = setupBrowserMocks();

  try {
    preferenceTracker.setUserId('user-123');

    for (let i = 0; i < 3; i += 1) {
      preferenceTracker.track({
        type: 'follow_up_asked',
        topic: 'Cloud Strategy',
        chatId: 'chat-xyz',
      });
    }

    await preferenceTracker.flush();

    assert.equal(fetchCalls.length, 1, 'Implicit preference should be saved once after flush');
    const [{ input, init }] = fetchCalls;
    assert.equal(input, '/api/preferences');
    assert.ok(init);
    assert.equal(init?.method, 'POST');
    assert.ok(init?.headers && typeof init.headers === 'object');
    const authHeader = init.headers.Authorization;
    assert.equal(authHeader, 'Bearer AUTH_TOKEN');

    const payload = JSON.parse(init?.body);
    assert.equal(payload.key, 'focus.cloud_strategy');
    assert.equal(payload.value, true);
    assert.equal(payload.source, 'implicit');
    assert.equal(payload.confidence, 0.8);

    preferenceTracker.reset();
  } finally {
    restore();
  }
});

test('flush deduplicates preferences and keeps highest confidence value', async () => {
  const preferenceTracker = await loadTracker();
  const { fetchCalls, restore } = setupBrowserMocks();

  try {
    preferenceTracker.setUserId('user-123');

    for (let i = 0; i < 4; i += 1) {
      preferenceTracker.track({
        type: 'follow_up_asked',
        topic: 'Cloud Strategy',
        chatId: 'chat-high-conf',
      });
    }

    await preferenceTracker.flush();

    assert.equal(fetchCalls.length, 1, 'Only one network call expected');
    const payload = JSON.parse(fetchCalls[0].init.body);
    assert.equal(payload.key, 'focus.cloud_strategy');
    assert.equal(payload.confidence, 0.85, 'Higher confidence should replace earlier value');

    preferenceTracker.reset();
  } finally {
    restore();
  }
});

test('flush skips network call when auth token is missing', async () => {
  const preferenceTracker = await loadTracker();
  const { fetchCalls, restore } = setupBrowserMocks({ token: null });

  try {
    preferenceTracker.setUserId('user-123');
    for (let i = 0; i < 3; i += 1) {
      preferenceTracker.track({
        type: 'follow_up_asked',
        topic: 'Cloud Strategy',
        chatId: 'chat-no-token',
      });
    }

    await preferenceTracker.flush();
    assert.equal(fetchCalls.length, 0, 'No network calls should be made without auth token');
    preferenceTracker.reset();
  } finally {
    restore();
  }
});

test('flush retries pending preferences after transient failure', async () => {
  const preferenceTracker = await loadTracker();
  let callCount = 0;
  const { fetchCalls, restore } = setupBrowserMocks({
    fetchImpl: async (_input, _init) => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('network down');
      }
      return { ok: true };
    },
  });

  try {
    preferenceTracker.setUserId('user-123');
    for (let i = 0; i < 3; i += 1) {
      preferenceTracker.track({
        type: 'follow_up_asked',
        topic: 'Cloud Strategy',
        chatId: 'chat-retry',
      });
    }

    await preferenceTracker.flush().catch(() => undefined);
    assert.equal(fetchCalls.length, 1, 'First attempt should fail');

    await preferenceTracker.flush();
    assert.equal(fetchCalls.length, 2, 'Second attempt should reuse pending preferences');
    const payload = JSON.parse(fetchCalls[1].init.body);
    assert.equal(payload.key, 'focus.cloud_strategy');

    preferenceTracker.reset();
  } finally {
    restore();
  }
});
