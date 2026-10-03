import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { money, SITE, useStore } from '../lib/store';
import { Button, Field, styles } from '../components/ui';

type Details = { senderName: string; senderPhone: string; email: string; receiverName: string; receiverPhone: string; location: string; state: string; address: string };
type Order = { orderNumber: string; totalMinor: number; subtotalMinor: number; shippingMinor: number; emailSent: boolean; cartCleared: boolean };
export default function Checkout() {
  const { client, session, cart, rates, cartReady, changing, refresh } = useStore();
  const [fields, setFields] = useState<Details>({ senderName: '', senderPhone: '', email: session?.user.email ?? '', receiverName: '', receiverPhone: '', location: '', state: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const lock = useRef(false);
  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.product.price_minor, 0);
  const rate = rates.find(value => value.state === fields.state);
  const field = (name: keyof Details) => ({ value: fields[name], onChangeText: (value: string) => setFields(previous => ({ ...previous, [name]: value })) });
  async function placeOrder() {
    if (lock.current) return;
    if (!session || !cartReady || changing || !cart.length || !rate) { setError('Sign in, wait for your cart, and select a delivery state.'); return; }
    if (Object.values(fields).some(value => !value.trim()) || !/^\S+@\S+\.\S+$/.test(fields.email) || fields.senderPhone.length < 7 || fields.receiverPhone.length < 7) { setError('Please complete all contact and delivery details.'); return; }
    lock.current = true; setBusy(true); setError('');
    const items = cart.map(line => ({ productId: line.product.id, quantity: line.quantity }));
    try {
      const current = await client.auth.getSession();
      if (!current.data.session || current.data.session.user.id !== session.user.id) throw new Error('Please sign in again before placing an order.');
      const response = await fetch(`${SITE}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${current.data.session.access_token}` }, body: JSON.stringify({ ...fields, items }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'We could not place your order.');
      setOrder(result); await refresh();
    } catch (reason) { setError(reason instanceof TypeError ? 'Could not confirm the order. Check your email or contact support before retrying to avoid a duplicate.' : reason instanceof Error ? reason.message : 'Could not confirm the order. Check your email before trying again to avoid a duplicate.'); }
    finally { setBusy(false); lock.current = false; }
  }
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={styles.title}>{order ? 'Order received.' : 'Almost yours.'}</Text>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {order ? <><Text style={styles.heading}>{order.orderNumber}</Text><Text style={styles.body}>{order.emailSent ? 'Your order confirmation is on its way.' : 'Keep this order number. Your confirmation email could not be sent yet.'}</Text><Text style={styles.body}>Items: {money(order.subtotalMinor)}{ '\n' }Shipping: {money(order.shippingMinor)}</Text><Text style={styles.heading}>Total: {money(order.totalMinor)}</Text><Text style={styles.notice}>Shopora will contact you to arrange payment. Payment is pending until confirmed.</Text>{!order.cartCleared && <Text style={styles.error}>Your order was saved, but cart cleanup failed. Remove purchased items before ordering again.</Text>}<Button title="Back to shop" onPress={() => router.replace('/')} /></> : <>
      <Text style={styles.heading}>Your contact details</Text><Field label="Sender’s full name" {...field('senderName')} autoComplete="name" /><Field label="Sender’s phone" {...field('senderPhone')} keyboardType="phone-pad" /><Field label="Email for order updates" {...field('email')} keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.heading}>Delivery details</Text><Field label="Receiver’s full name" {...field('receiverName')} /><Field label="Receiver’s phone" {...field('receiverPhone')} keyboardType="phone-pad" /><Field label="City or town" {...field('location')} />
      <View><Text style={styles.label}>Delivery state</Text><Picker accessibilityLabel="Delivery state" selectedValue={fields.state} onValueChange={value => setFields(previous => ({ ...previous, state: value }))} enabled={rates.length > 0}><Picker.Item label="Select your state" value="" />{rates.map(value => <Picker.Item key={value.state} label={value.state} value={value.state} />)}</Picker></View><Field label="Street address and nearby landmark" {...field('address')} multiline />
      {cart.map(line => <Text key={line.product.id} style={styles.body}>{line.product.name} × {line.quantity} — {money(line.quantity * line.product.price_minor)}</Text>)}
      <Text style={styles.body}>Subtotal: {money(subtotal)}{ '\n' }Shipping: {rate ? money(rate.fee_minor) : 'Select delivery state'}</Text><Text style={styles.heading}>Total: {rate ? money(subtotal + rate.fee_minor) : 'Select delivery state'}</Text><Text style={styles.notice}>Place your order and we’ll contact you to arrange payment. Delivery usually takes 3–4 days after confirmation.</Text><Button title={busy ? 'Placing order…' : 'Place order'} disabled={busy || !session || !cartReady || changing || !cart.length || !rate} onPress={() => void placeOrder()} />
    </>}
  </ScrollView></KeyboardAvoidingView>;
}
