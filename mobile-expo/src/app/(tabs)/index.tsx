import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore, money } from '../../lib/store';
import { Button, Field, ProductImage, styles } from '../../components/ui';

export default function Shop() {
  const { products, session, cartReady, change, error, catalogError } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(products.map(product => product.category))];
  const filtered = products.filter(product => (category === 'All' || product.category === category) && product.name.toLowerCase().includes(search.toLowerCase()));
  return <FlatList style={styles.page} contentContainerStyle={styles.content} data={filtered} keyExtractor={product => product.id}
    ListHeaderComponent={<View style={{ gap: 16 }}><Text style={styles.title}>Good things, picked for you.</Text><Text style={styles.body}>Electronics, perfumes and a little everyday joy.</Text><Field label="Find something lovely" placeholder="Search products" value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{categories.map(value => <Pressable accessibilityRole="button" key={value} onPress={() => setCategory(value)} style={[styles.button, { backgroundColor: value === category ? '#224737' : '#e9eddf' }]}><Text style={[styles.buttonText, { color: value === category ? '#fff' : '#224737' }]}>{value}</Text></Pressable>)}</ScrollView>
      {!!(error || catalogError) && <Text accessibilityRole="alert" style={styles.error}>{error || catalogError}</Text>}
    </View>}
    ListEmptyComponent={<Text style={styles.body}>{products.length ? 'No products match your search.' : 'No products available yet. Check your connection if this persists.'}</Text>}
    renderItem={({ item }) => <View style={styles.card}><ProductImage product={item} /><Text style={styles.heading}>{item.name}</Text><Text style={styles.body}>{item.description}</Text><Text style={styles.label}>{money(item.price_minor)}</Text><Button title={session ? 'Add to cart' : 'Sign in to shop'} disabled={!!session && !cartReady} onPress={() => { if (!session) router.push('/account'); else void change(item, 1); }} /></View>}
  />;
}
