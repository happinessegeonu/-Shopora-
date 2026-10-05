import React, { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text } from 'react-native';
import { useStore, SITE } from '../../lib/store';
import { Button, Field, styles } from '../../components/ui';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { completeOAuth } from '../../lib/oauth';

export default function Account() {
  const { client, session, changing, signOut } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function googleLogin() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const redirectTo = ExpoLinking.createURL('auth/callback');
      const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
      if (error) throw error;
      if (!data.url) throw new Error('Google sign-in is unavailable.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') await completeOAuth(client, result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Google sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function login() {
    if (busy) return; setBusy(true); setError('');
    try { const result = await client.auth.signInWithPassword({ email: email.trim(), password }); if (result.error) throw new Error(result.error.message); setPassword(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function logout() { setBusy(true); setError(''); try { await signOut(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-out failed.'); } finally { setBusy(false); } }
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><Text style={styles.title}>{session ? 'Welcome back.' : 'Your Shopora account.'}</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {session ? <><Text style={styles.body}>Signed in as {session.user.email}</Text><Text style={styles.notice}>Your cart follows you between the website and this app.</Text><Button title="Sign out" disabled={busy || changing} onPress={() => void logout()} /></> : <><Text style={styles.body}>Use your existing Shopora account to sync your cart with the website.</Text><Button title="Continue with Google" disabled={busy} onPress={() => void googleLogin()} /><Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" /><Button title={busy ? 'Signing in…' : 'Sign in'} disabled={busy || !email.trim() || !password} onPress={() => void login()} /><Button light title="Create an account or reset password on the website" onPress={() => void Linking.openURL(SITE)} /><Text style={styles.body}>Google sign-in and email sign-in use the same Shopora account system.</Text></>}
    <Text style={styles.heading}>Sell on Shopora</Text><Text style={styles.body}>Foodstuffs, groceries, fashion, beauty, tech, and home sellers are welcome. Submit products and follow review status in your seller space on the website.</Text><Button light title="Open your seller space" onPress={() => void Linking.openURL(`${SITE}/sell`).catch(() => setError('Could not open the seller page. Please try again.'))} />
    <Button light title="Contact customer support" onPress={() => void Linking.openURL('mailto:support@makatechlimited.com?subject=Shopora%20support')} />
  </ScrollView></KeyboardAvoidingView>;
}
