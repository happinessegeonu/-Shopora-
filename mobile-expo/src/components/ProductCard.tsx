import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { money, type Product } from '../lib/store';
import { theme } from '../lib/theme';
import { ProductImage, styles } from './ui';

export function ProductCard({ product }: { product: Product }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.name}, ${money(product.price_minor)}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} style={({ pressed }) => [card.container, pressed && { opacity: 0.8 }]}>
    <ProductImage product={product} />
    <View style={card.copy}><Text style={styles.eyebrow} numberOfLines={1}>{product.category}</Text><Text style={card.name} numberOfLines={2}>{product.name}</Text><Text style={card.price}>{money(product.price_minor)}</Text><Text style={styles.caption}>View product ↗</Text></View>
  </Pressable>;
}
const card = StyleSheet.create({
  container: { flex: 1, minWidth: 0, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.line, backgroundColor: '#fff' },
  copy: { padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.line },
  name: { fontSize: 14, fontWeight: '600', lineHeight: 21, minHeight: 42, color: theme.colors.ink },
  price: { fontSize: 16, fontWeight: '700', color: theme.colors.green },
});
