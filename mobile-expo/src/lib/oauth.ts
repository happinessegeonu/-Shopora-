import type { SupabaseClient } from '@supabase/supabase-js';

// The browser result and Router callback can arrive together. Exchange once.
let lastCode = '';
let exchange: Promise<void> | undefined;
export function completeOAuth(client: SupabaseClient, url: string): Promise<void> {
  const callback = new URL(url);
  const error = callback.searchParams.get('error_description') || callback.searchParams.get('error');
  if (error) return Promise.reject(new Error(error));
  const code = callback.searchParams.get('code');
  if (!code) return Promise.reject(new Error('Sign-in did not return a code. Please try again.'));
  if (code === lastCode && exchange) return exchange;
  lastCode = code;
  exchange = client.auth.exchangeCodeForSession(code).then(({ error }) => { if (error) throw error; });
  return exchange;
}
