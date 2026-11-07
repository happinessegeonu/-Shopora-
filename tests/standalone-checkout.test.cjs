const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}) {
 const sandbox = { exports: {}, require: name => dependencies[name], Request, URL, process: { env: { AUTH_APP_ORIGIN: 'https://shopora.example' } } };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(path), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
 return sandbox.exports;
}
const security = load('../src/server/request-security.ts');
const { validateCheckout } = load('../src/server/checkout.ts', { './postgres': {}, './request-security': security });
const checkout = () => ({ email: 'buyer@example.com', senderName: 'Buyer', senderPhone: '08012345678', receiverName: 'Buyer', receiverPhone: '08012345678', location: 'Abuja', state: 'FCT', address: 'Test address', items: [{ productId: 'phone', quantity: 1 }] });
test('checkout discards forged prices, totals and account ownership', () => {
 const result = validateCheckout({ ...checkout(), userId: 'someone-else', totalMinor: 1, items: [{ productId: 'phone', quantity: 1, price: 1 }] });
 assert.equal(result.userId, undefined);
 assert.equal(result.totalMinor, undefined);
 assert.equal(result.items[0].price, undefined);
});
test('checkout rejects duplicate items and invalid or excessive quantities', () => {
 for (const quantity of [-1, 0, 1.5, 51, '1']) assert.throws(() => validateCheckout({ ...checkout(), items: [{ productId: 'phone', quantity }] }));
 assert.throws(() => validateCheckout({ ...checkout(), items: [{ productId: 'phone', quantity: 1 }, { productId: 'phone', quantity: 1 }] }));
});
test('cookie mutations reject external origins and unauthenticated native requests', () => {
 assert.throws(() => security.requireSameOriginMutation(new Request('https://shopora.example/api/store/cart', { headers: { origin: 'https://attacker.example' } })));
 assert.throws(() => security.requireSameOriginMutation(new Request('https://shopora.example/api/store/cart')));
 assert.doesNotThrow(() => security.requireSameOriginMutation(new Request('https://shopora.example/api/store/cart', { headers: { origin: 'https://shopora.example' } })));
});
