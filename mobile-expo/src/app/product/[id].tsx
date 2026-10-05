import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore, money } from '../../lib/store';
import { Button, ProductImage, styles } from '../../components/ui';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, session, cart, cartReady, changing, change, error, catalogLoading, catalogError, reloadCatalog } = useStore();
  const [quantity, setQuantity] = useState(1);
  const product = products.find(item => item.id === id);
  if (!product) return <View style={[styles.page, styles.content]}>{catalogLoading ? <><ActivityIndicator /><Text style={styles.body}>Loading product…</Text></> : <><Text style={styles.title}>Product unavailable.</Text><Text style={styles.body}>{catalogError || 'This product may no longer be available. Explore the market for another find.'}</Text><Button light title="Refresh products" onPress={() => void reloadCatalog()} /><Button title="Back to shop" onPress={() => router.replace('/')} /></>}</View>;
  const inBag = cart.find(line => line.product.id === product.id)?.quantity ?? 0;
  const atLimit = inBag + quantity > 50;
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.card}><ProductImage product={product} large /></View><Text style={styles.eyebrow}>{product.category}</Text><Text style={styles.title}>{product.name}</Text><Text style={[styles.heading, { color: '#435b45' }]}>{money(product.price_minor)}</Text>
    <View style={styles.card}><Text style={styles.heading}>The details</Text><Text style={styles.body}>{product.description || 'Contact Shopora support if you need more information before ordering.'}</Text></View>
    <View style={styles.card}><Text style={styles.label}>Quantity</Text><View style={styles.row}><Button light title="−" disabled={quantity <= 1 || changing} onPress={() => setQuantity(value => value - 1)} /><Text accessibilityLiveRegion="polite" style={styles.heading}>{quantity}</Text><Button light title="+" disabled={quantity >= 50 || changing} onPress={() => setQuantity(value => value + 1)} /></View><Text style={styles.label}>Items total: {money(product.price_minor * quantity)}</Text><Text style={styles.caption}>Shipping is shown at checkout.{inBag > 0 ? ` You already have ${inBag} in your bag.` : ''}</Text></View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{session && atLimit && <Text style={styles.error}>Your bag can hold up to 50 of this product. Reduce the quantity to add more.</Text>}
    <Button title={!session ? 'Sign in to add to bag' : changing ? 'Saving your bag…' : !cartReady ? 'Waiting for cart sync…' : 'Add to bag +'} disabled={!!session && (!cartReady || changing || atLimit)} onPress={() => { if (!session) router.push('/account'); else void change(product, quantity); }} />
    {session && inBag > 0 && <Button light title="View your bag →" onPress={() => router.push('/cart')} />}
    <Text style={styles.notice}>Payment stays pending until confirmed. Check the product description for pack size, condition, and any food storage requirements.</Text>
  </ScrollView>;
}
