const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path) {
 const sandbox = { exports: {}, decodeURIComponent };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(path), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
 return sandbox.exports;
}
const { authErrorMessage, passwordError } = load('../src/lib/auth-feedback.ts');
const { authReturnPath } = load('../src/lib/auth-return.ts');
test('auth return paths accept password reset but reject external and malformed destinations', () => {
 assert.equal(authReturnPath('%2Fauth%2Freset-password'), '/auth/reset-password');
 assert.equal(authReturnPath('/sell'), '/sell');
 assert.equal(authReturnPath('/app'), '/app');
 for (const destination of ['https://evil.example', '//evil.example', '/\\evil.example', '%E0%A4', '/auth/reset-password?next=https://evil.example']) assert.equal(authReturnPath(destination), '/');
});
test('password confirmation prevents weak or mismatched new passwords', () => {
 assert.match(passwordError('short', 'short'), /8 characters/);
 assert.match(passwordError('long-password', 'different-password'), /do not match/);
 assert.equal(passwordError('long-password', 'long-password'), '');
});
test('login errors do not disclose whether an email exists and recovery failures offer another link', () => {
 assert.match(authErrorMessage({ code: 'invalid_credentials' }), /email or password is incorrect/);
 assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /resend/);
 assert.match(authErrorMessage({ code: 'otp_expired' }), /new email/);
 assert.match(authErrorMessage({ code: 'over_email_send_rate_limit' }), /wait/);
 assert.match(authErrorMessage({ message: 'Failed to fetch' }), /internet/);
});
