import React from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SITE, type Product } from '../lib/store';

export function Button({ title, onPress, disabled = false, light = false }: { title: string; onPress: () => void; disabled?: boolean; light?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={[styles.button, light && styles.lightButton, disabled && { opacity: 0.45 }]}><Text style={[styles.buttonText, light && { color: '#224737' }]}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 6 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#777b72" style={styles.input} {...props} /></View>;
}
export function ProductImage({ product }: { product: Product }) {
  const image = product.image_url;
  if (!image || (!image.startsWith('/') && !image.startsWith('https://'))) return <View style={styles.image}><Text style={styles.title}>✳</Text></View>;
  return <Image accessibilityLabel={product.name} source={{ uri: image.startsWith('/') ? `${SITE}${image}` : image }} resizeMode="contain" style={styles.image} />;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fbf8ef' }, content: { padding: 20, paddingBottom: 40, gap: 18 },
  title: { fontSize: 32, fontWeight: '700', color: '#224737' }, heading: { fontSize: 23, fontWeight: '600', color: '#224737' },
  body: { fontSize: 16, lineHeight: 24, color: '#4f5a50' }, label: { fontSize: 14, fontWeight: '600', color: '#224737' },
  input: { backgroundColor: '#fff', color: '#224737', borderColor: '#d9ddcf', borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  button: { padding: 15, borderRadius: 14, backgroundColor: '#224737', alignItems: 'center', minHeight: 48 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }, lightButton: { backgroundColor: '#e9eddf' },
  card: { borderRadius: 20, padding: 16, backgroundColor: '#fff', gap: 12 }, image: { width: '100%', height: 170, backgroundColor: '#f3f0e6', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  notice: { color: '#224737', backgroundColor: '#e9eddf', padding: 14, borderRadius: 12, lineHeight: 22 },
  error: { color: '#8b2a26', backgroundColor: '#f9e5df', padding: 14, borderRadius: 12, lineHeight: 22 },
});
