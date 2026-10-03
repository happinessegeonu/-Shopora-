import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { SupabaseClient } from '@supabase/supabase-js';
import { connectStore, StoreProvider } from '../lib/store';
import { Button, styles } from '../components/ui';

export default function Layout() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void connectStore().then(value => { if (active) setClient(value); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [attempt]);
  return <SafeAreaProvider><StatusBar style="dark" />{client ? <StoreProvider client={client}><Stack screenOptions={{ headerStyle: { backgroundColor: '#fbf8ef' }, headerTintColor: '#224737' }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="checkout" options={{ title: 'Checkout' }} /></Stack></StoreProvider> : <View style={[styles.page, { padding: 28, justifyContent: 'center', gap: 20 }]}><Text style={styles.title}>shopora ✳</Text>{error ? <><Text style={styles.error}>{error}</Text><Button title="Try again" onPress={() => { setError(''); setAttempt(value => value + 1); }} /></> : <><ActivityIndicator color="#224737" /><Text style={styles.body}>Opening the good things…</Text></>}</View>}</SafeAreaProvider>;
}
