import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore, SITE, type Product } from '../../lib/store';
import { theme } from '../../lib/theme';
import { Button, Field, styles } from '../../components/ui';
import { ProductCard } from '../../components/ProductCard';

export default function Shop() {
  const { products, catalogError, catalogLoading, reloadCatalog } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Featured');
  const [linkError, setLinkError] = useState('');
  const list = useRef<FlatList<Product>>(null);
  const categories = ['All', ...new Set(products.map(product => product.category))];
  const filtered = products.filter(product => (category === 'All' || product.category === category) && `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => sort === 'Lowest price' ? a.price_minor - b.price_minor : sort === 'Highest price' ? b.price_minor - a.price_minor : 0);
  return <FlatList ref={list} style={styles.page} contentContainerStyle={shop.content} data={filtered} numColumns={2} columnWrapperStyle={{ gap: 12 }} keyExtractor={product => product.id} refreshing={catalogLoading} onRefresh={() => void reloadCatalog()} keyboardShouldPersistTaps="handled"
    ListHeaderComponent={<View style={{ gap: 22, marginBottom: 20 }}>
      <View style={shop.hero}><Text style={styles.eyebrow}>YOUR EVERYDAY MARKETPLACE</Text><Text style={shop.heroTitle}>Your market.{ '\n' }<Text style={{ color: theme.colors.green, fontStyle: 'italic' }}>Your people.</Text></Text><Text style={styles.body}>Good finds for your everyday. A bigger audience for your business.</Text><Text style={shop.heroNote}>Foodstuffs · Fashion · Beauty · Tech · Home</Text><Button title="Explore the good stuff ↓" onPress={() => list.current?.scrollToOffset({ offset: 280, animated: true })} /></View>
      <View style={shop.promise}><Text style={styles.eyebrow}>GOOD FINDS. GROWING BUSINESSES.</Text><Text style={styles.caption}>Shared cart across web and app · Shipping shown at checkout</Text></View>
      <View style={{ gap: 12 }}><Text style={styles.eyebrow}>A FEW OF YOUR NEXT FAVOURITES</Text><Text style={styles.title}>Meet the good stuff.</Text><Field label="Search the market" placeholder="Product, description, or category" value={search} onChangeText={setSearch} returnKeyType="search" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{categories.map(value => <Pressable accessibilityRole="button" accessibilityState={{ selected: value === category }} key={value} onPress={() => setCategory(value)} style={[shop.chip, value === category && shop.selected]}><Text style={[shop.chipText, value === category && { color: '#fff' }]}>{value === 'All' ? 'Everything' : value}</Text></Pressable>)}</ScrollView>
      <View style={{ gap: 10 }}><Text accessibilityLiveRegion="polite" style={styles.caption}>{filtered.length} {filtered.length === 1 ? 'product' : 'products'} · Sort by</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{['Featured', 'Lowest price', 'Highest price'].map(value => <Pressable accessibilityRole="button" accessibilityState={{ selected: value === sort }} key={value} style={[shop.chip, sort === value && shop.selected]} onPress={() => setSort(value)}><Text style={[shop.chipText, value === sort && { color: '#fff' }]}>{value}</Text></Pressable>)}</ScrollView></View>
      {!!catalogError && <><Text accessibilityRole="alert" style={styles.error}>{catalogError}</Text><Button light title="Retry loading products" onPress={() => void reloadCatalog()} /></>}
    </View>}
    ListEmptyComponent={<View style={styles.card}>{catalogLoading ? <><ActivityIndicator color={theme.colors.green} /><Text style={styles.body}>Finding the good things…</Text></> : <><Text style={styles.heading}>{products.length ? 'Let’s try another search.' : 'The market is getting ready.'}</Text><Text style={styles.body}>{products.length ? 'Try a product name or explore another category.' : 'Pull down to refresh available products.'}</Text><Button light title={products.length ? 'Clear filters' : 'Refresh products'} onPress={() => { setSearch(''); setCategory('All'); if (!products.length) void reloadCatalog(); }} /></>}</View>}
    renderItem={({ item }) => <ProductCard product={item} />}
    ListFooterComponent={<View style={[shop.seller, { marginTop: 26 }]}><Text style={shop.sellerEyebrow}>GROW WITH SHOPORA</Text><Text style={shop.sellerTitle}>Your business belongs here.</Text><Text style={shop.sellerBody}>From rice and spices to handmade goods, bring what you sell. Start with one product and keep 90% of completed product sales; shipping is separate.</Text><Button light title="Start selling on the website ↗" onPress={() => { setLinkError(''); void Linking.openURL(`${SITE}/sell`).catch(() => setLinkError('Could not open the seller page. Please try again.')); }} /><Text style={shop.sellerBody}>Listings are reviewed. Food storage and delivery need confirmation before approval. Your browser may ask you to sign in again.</Text>{!!linkError && <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text>}</View>}
  />;
}
const shop = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  hero: { padding: 24, backgroundColor: theme.colors.peach, borderRadius: 18, borderWidth: 1, borderColor: '#e9ddce', gap: 18 },
  heroTitle: { fontFamily: theme.serif, fontSize: 44, lineHeight: 50, color: theme.colors.ink },
  heroNote: { fontSize: 11, lineHeight: 20, color: theme.colors.green },
  promise: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.line, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.white, justifyContent: 'center' },
  selected: { backgroundColor: theme.colors.green, borderColor: theme.colors.green }, chipText: { fontSize: 12, color: theme.colors.ink },
  seller: { padding: 24, backgroundColor: theme.colors.green, borderRadius: 18, gap: 16 }, sellerEyebrow: { fontSize: 10, letterSpacing: 1.8, color: theme.colors.gold },
  sellerTitle: { fontFamily: theme.serif, fontSize: 30, color: theme.colors.white }, sellerBody: { fontSize: 13, lineHeight: 22, color: '#e2e8df' },
});
