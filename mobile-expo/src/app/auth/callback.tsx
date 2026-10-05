import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '../../lib/store';
import { completeOAuth } from '../../lib/oauth';
import { Button, styles } from '../../components/ui';

WebBrowser.maybeCompleteAuthSession();
export default function AuthCallback() {
  const { client } = useStore();
  const url = Linking.useURL();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!url) return;
    let active = true;
    void completeOAuth(client, url).then(() => { if (active) router.replace('/(tabs)/account'); }).catch(() => { if (active) setError('Could not complete Google sign-in. Return to Account and try again.'); });
    return () => { active = false; };
  }, [client, url]);
  return <View style={[styles.page, styles.content]}><Text style={styles.title}>Your Shopora account</Text><Text style={styles.body}>{error || 'Completing sign-in…'}</Text><Button title="Return to Account" onPress={() => router.replace('/(tabs)/account')} /></View>;
}
