import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SITE, type Product } from '../lib/store';
import { theme } from '../lib/theme';

export function Button({ title, onPress, disabled = false, light = false }: { title: string; onPress: () => void; disabled?: boolean; light?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, light && styles.lightButton, (disabled || pressed) && { opacity: disabled ? 0.45 : 0.8 }]}><Text style={[styles.buttonText, light && { color: theme.colors.green }]}>{title}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={theme.colors.muted} style={styles.input} {...props} /></View>;
}
export function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  const image = product.image_url;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  if (failedImage === image || !image || (!image.startsWith('/') && !image.startsWith('https://'))) return <View style={[styles.image, large && { height: 320 }]}><Text accessibilityLabel="Product photo unavailable" style={styles.title}>✳</Text><Text style={styles.caption}>Photo unavailable</Text></View>;
  return <Image accessibilityLabel={product.name} source={{ uri: image.startsWith('/') ? `${SITE}${image}` : image }} onError={() => setFailedImage(image)} resizeMode="contain" style={[styles.image, large && { height: 320 }]} />;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.paper }, content: { padding: 20, paddingBottom: 40, gap: 18 },
  title: { fontSize: 34, fontFamily: theme.serif, color: theme.colors.ink }, heading: { fontSize: 23, fontFamily: theme.serif, color: theme.colors.ink },
  body: { fontSize: 15, lineHeight: 24, color: theme.colors.muted }, label: { fontSize: 13, fontWeight: '600', color: theme.colors.ink },
  caption: { fontSize: 11, lineHeight: 17, color: theme.colors.muted }, eyebrow: { fontSize: 10, letterSpacing: 1.8, fontWeight: '600', color: theme.colors.green },
  input: { backgroundColor: theme.colors.white, color: theme.colors.ink, borderColor: theme.colors.line, borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  button: { padding: 15, borderRadius: 28, backgroundColor: theme.colors.green, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  buttonText: { color: theme.colors.white, fontSize: 14, fontWeight: '600' }, lightButton: { backgroundColor: theme.colors.soft },
  card: { borderRadius: theme.radius, padding: 16, backgroundColor: theme.colors.white, borderColor: theme.colors.line, borderWidth: 1, gap: 12 }, image: { width: '100%', height: 170, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  notice: { color: theme.colors.green, backgroundColor: theme.colors.soft, padding: 14, borderRadius: 12, lineHeight: 22 },
  error: { color: theme.colors.error, backgroundColor: '#f9e5df', padding: 14, borderRadius: 12, lineHeight: 22 },
});
