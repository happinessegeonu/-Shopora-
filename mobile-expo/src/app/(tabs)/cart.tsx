import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore, money } from '../../lib/store';
import { Button, ProductImage, styles } from '../../components/ui';

export default function Cart() {
  const { session, cart, cartReady, syncing, error, changing, change, refresh } = useStore();
  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.product.price_minor, 0);
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}><Text style={styles.title}>A good choice.</Text><Text style={styles.notice}>{syncing}</Text>
    {!!error && <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button light title="Retry cart sync" onPress={() => void refresh()} /></>}
    {!session ? <><Text style={styles.body}>Sign in with the same account as the website to see your shared cart.</Text><Button title="Sign in" onPress={() => router.push('/account')} /></> : <>
      {!cart.length && <Text style={styles.body}>{cartReady ? 'Your cart is waiting for something lovely.' : 'Loading your cart…'}</Text>}
      {cart.map(line => <View key={line.product.id} style={styles.card}><ProductImage product={line.product} /><Text style={styles.heading}>{line.product.name}</Text><Text style={styles.body}>{money(line.product.price_minor)} each</Text><View style={styles.row}><Button light title="−" disabled={!cartReady || changing} onPress={() => void change(line.product, -1)} /><Text style={styles.heading}>{line.quantity}</Text><Button light title="+" disabled={!cartReady || changing || line.quantity >= 50} onPress={() => void change(line.product, 1)} /></View><Text style={styles.label}>{money(line.quantity * line.product.price_minor)}</Text><Button light title="Remove" disabled={!cartReady || changing} onPress={() => void change(line.product, -line.quantity)} /></View>)}
      <View style={styles.row}><Text style={styles.heading}>Subtotal</Text><Text style={styles.heading}>{money(subtotal)}</Text></View><Text style={styles.body}>Shipping is added at checkout based on your delivery state.</Text><Button title={changing ? 'Saving cart…' : 'Checkout'} disabled={!cartReady || changing || !cart.length} onPress={() => router.push('/checkout')} />
    </>}
  </ScrollView>;
}
