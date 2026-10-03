const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ user = { id: 'customer-id' }, invalid = false } = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async token => { calls.push(['getUser', token]); return { data: { user: invalid ? null : user }, error: invalid ? { message: 'Invalid token' } : null }; } },
    rpc: async (name, args) => { calls.push([name, args]); return { error: null, data: { order_number: 'SH-TEST', subtotal_minor: 10000, shipping_minor: 500000, total_minor: 510000, items: [] } }; },
  };
  const modules = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    'next/headers': { cookies: async () => ({ getAll: () => [], set() {} }) },
    '@supabase/ssr': { createServerClient: () => { calls.push(['cookieClient']); return client; } },
    '@supabase/supabase-js': { createClient: (_url, _key, options) => { calls.push(['tokenClient', options]); return client; } },
    '@/lib/order-email': { sendOrderEmails: async () => { calls.push(['emails']); return { emailSent: true, ownerEmailSent: true }; } },
  };
  const sandbox = { exports: {}, require: name => { assert.ok(modules[name], name); return modules[name]; }, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key' } }, console: { error() {} } };
  const source = fs.readFileSync(require.resolve('../src/app/api/orders/route.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  const body = { email: 'customer@example.com', senderName: 'Customer', senderPhone: '00000000000', receiverName: 'Receiver', receiverPhone: '00000000000', state: 'Lagos', location: 'Ikeja', address: 'Test address', items: [{ productId: 'test-product', quantity: 1 }] };
  const request = authorization => ({ headers: new Headers(authorization ? { authorization } : {}), json: async () => body });
  return { post: sandbox.exports.POST, request, calls };
}

test('mobile bearer authentication validates identity before order creation and clears that customer cart', async () => {
  const { post, request, calls } = setup();
  const result = await post(request('Bearer test-access-token'));
  assert.equal(result.status, 201);
  assert.equal(calls.find(call => call[0] === 'tokenClient')[1].global.headers.Authorization, 'Bearer test-access-token');
  assert.equal(calls.find(call => call[0] === 'getUser')[1], 'test-access-token');
  assert.equal(calls.find(call => call[0] === 'create_store_order')[1].p_customer_id, 'customer-id');
  assert.ok(calls.some(call => call[0] === 'consume_my_cart'));
  assert.ok(calls.some(call => call[0] === 'emails'));
});
test('invalid mobile tokens cannot place an anonymous order or send emails', async () => {
  const { post, request, calls } = setup({ invalid: true });
  assert.equal((await post(request('Bearer invalid-token'))).status, 401);
  assert.ok(!calls.some(call => ['create_store_order', 'consume_my_cart', 'emails'].includes(call[0])));
});
test('malformed authorization is rejected before authentication or order creation', async () => {
  const { post, request, calls } = setup();
  assert.equal((await post(request('Basic invalid'))).status, 401);
  assert.equal(calls.length, 0);
});
test('website cookie authentication still associates the order and clears its cart', async () => {
  const { post, request, calls } = setup();
  assert.equal((await post(request())).status, 201);
  assert.ok(calls.some(call => call[0] === 'cookieClient'));
  assert.equal(calls.find(call => call[0] === 'create_store_order')[1].p_customer_id, 'customer-id');
});
test('guest website checkout stays supported and never clears an account cart', async () => {
  const { post, request, calls } = setup({ user: null });
  assert.equal((await post(request())).status, 201);
  assert.equal(calls.find(call => call[0] === 'create_store_order')[1].p_customer_id, null);
  assert.ok(!calls.some(call => call[0] === 'consume_my_cart'));
});
