// Authenticated pages, API responses and carts are never cached.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shopora offline</title><body><h1>You are offline</h1><p>Reconnect to sign in, sync your cart, or place an order.</p><button onclick="location.reload()">Try again</button></body></html>',
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
  )));
});
