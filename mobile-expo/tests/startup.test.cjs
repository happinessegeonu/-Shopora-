const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('startup creates the shared store without waiting for a website fetch', async () => {
  let networkCalls = 0;
  const config = { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'public-test-key' };
  const created = {};
  const sandbox = {
    exports: {},
    require(name) {
      if (name === './store-config.json') return config;
      if (name === '@supabase/supabase-js') return { createClient(url, key, options) {
        assert.equal(url, config.supabaseUrl); assert.equal(key, config.supabaseAnonKey);
        assert.equal(options.auth.flowType, 'pkce'); return created;
      } };
      if (name === 'react') return { createContext: () => ({}) };
      return {};
    },
    fetch() { networkCalls++; throw new Error('Website unavailable'); },
  };
  const source = fs.readFileSync(require.resolve('../src/lib/store.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, sandbox);
  assert.equal(await sandbox.exports.connectStore(), created);
  assert.equal(networkCalls, 0);
});
test('bundled key is public and not a server credential', () => {
  const config = require('../src/lib/store-config.json');
  assert.match(config.supabaseUrl, /^https:\/\//);
  const key = config.supabaseAnonKey;
  if (key.startsWith('sb_publishable_')) return;
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
  assert.equal(payload.role, 'anon');
});
