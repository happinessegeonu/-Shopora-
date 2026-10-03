const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const order = {
  orderNumber: "SH-TEST", subtotalMinor: 1000000, shippingMinor: 500000, totalMinor: 1500000,
  items: [{ name: "Test product", quantity: 2, line_total: 1000000 }],
  email: "customer@example.com", senderName: "Customer", senderPhone: "00000000000",
  receiverName: "Receiver", receiverPhone: "00000000000", location: "Test city, Lagos", address: "Test address",
};

function setup(overrides = {}, responses = [true, true]) {
  const requests = [];
  const sandbox = {
    exports: {},
    require: (name) => {
      assert.equal(name, "@/lib/payment");
      return { bankTransfer: { bank: "Test bank", accountNumber: "0000000000", accountName: "Test store" } };
    },
    process: { env: { MAILGUN_API_KEY: "test-key", MAILGUN_DOMAIN: "example.com", MAILGUN_FROM_EMAIL: "store@example.com", ORDER_NOTIFICATION_EMAIL: "owner@example.com", ...overrides } },
    FormData, Buffer, AbortSignal, Intl,
    console: { error() {} },
    fetch: async (url, options) => {
      requests.push({ url, ...Object.fromEntries(options.body.entries()) });
      const result = responses[requests.length - 1];
      if (result instanceof Error) throw result;
      return { ok: result, status: result ? 200 : 500 };
    },
  };
  const source = fs.readFileSync(require.resolve("../src/lib/order-email.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(outputText, sandbox);
  return { sendOrderEmails: sandbox.exports.sendOrderEmails, requests };
}

test("customer and owner receive separate pending-payment emails with shipping totals and correct replies", async () => {
  const { sendOrderEmails, requests } = setup();
  const result = await sendOrderEmails(order);
  assert.equal(result.emailSent, true);
  assert.equal(result.ownerEmailSent, true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].to, "customer@example.com");
  assert.equal(requests[0]["h:Reply-To"], "owner@example.com");
  assert.equal(requests[1].to, "owner@example.com");
  assert.equal(requests[1]["h:Reply-To"], "customer@example.com");
  for (const message of requests) {
    assert.match(message.text, /Shipping:.*5,000/);
    assert.match(message.text, /Order total:.*15,000/);
    assert.match(message.text, /SH-TEST/);
    assert.match(message.text, /awaiting bank transfer/);
  }
  assert.match(requests[1].text, /not proof of payment/);
  assert.match(requests[1].text, /Quantity: 2 \| Unit price:.*5,000 \| Line total:.*10,000/);
  assert.match(requests[1].text, /Customer email: customer@example.com/);
  assert.match(requests[1].text, /Customer phone: 00000000000/);
  assert.match(requests[1].text, /Address: Test address/);
});

test("customer mail failure does not prevent the owner notification", async () => {
  const { sendOrderEmails, requests } = setup({}, [new Error("Provider unavailable"), true]);
  const result = await sendOrderEmails(order);
  assert.equal(result.emailSent, false);
  assert.equal(result.ownerEmailSent, true);
  assert.equal(requests.length, 2);
});

test("owner mail failure does not invalidate the customer confirmation", async () => {
  const { sendOrderEmails } = setup({}, [true, false]);
  const result = await sendOrderEmails(order);
  assert.equal(result.emailSent, true);
  assert.equal(result.ownerEmailSent, false);
});

test("missing provider credentials cause no outbound requests", async () => {
  const { sendOrderEmails, requests } = setup({ MAILGUN_API_KEY: "" });
  const result = await sendOrderEmails(order);
  assert.equal(result.emailSent, false);
  assert.equal(result.ownerEmailSent, false);
  assert.equal(requests.length, 0);
});

test("invalid notification addresses cannot add email headers or recipients", async () => {
  const { sendOrderEmails, requests } = setup({ ORDER_NOTIFICATION_EMAIL: "owner@example.com\r\nBcc: stranger@example.com", ORDER_REPLY_TO_EMAIL: "invalid" });
  const result = await sendOrderEmails(order);
  assert.equal(result.ownerEmailSent, false);
  assert.equal(requests.length, 1);
  assert.equal(requests[0]["h:Reply-To"], undefined);
});
