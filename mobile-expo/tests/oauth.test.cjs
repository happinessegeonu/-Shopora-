const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load() {
  const source = fs.readFileSync(require.resolve('../src/lib/oauth.ts'), 'utf8');
  const sandbox = { exports: {}, URL, Promise, Error };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  return sandbox.exports.completeOAuth;
}
test('browser and route callbacks exchange a PKCE code only once', async () => {
  const complete = load(); let calls = 0;
  const client = { auth: { exchangeCodeForSession: async code => { assert.equal(code, 'test-code'); calls++; return { error: null }; } } };
  await Promise.all([complete(client, 'shopora://auth/callback?code=test-code'), complete(client, 'shopora://auth/callback?code=test-code')]);
  assert.equal(calls, 1);
});
test('cancelled or malformed callback does not exchange credentials', async () => {
  const complete = load(); let calls = 0;
  const client = { auth: { exchangeCodeForSession: async () => { calls++; return { error: null }; } } };
  await assert.rejects(complete(client, 'shopora://auth/callback?error=access_denied'), /access_denied/);
  await assert.rejects(complete(client, 'shopora://auth/callback'), /did not return a code/);
  assert.equal(calls, 0);
});
