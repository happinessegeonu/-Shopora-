import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useStore } from '../../lib/store';

export default function TabLayout() {
  const { cart } = useStore();
  const quantity = cart.reduce((sum, line) => sum + line.quantity, 0);
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: '#fbf8ef' }, headerTintColor: '#224737', tabBarActiveTintColor: '#224737', tabBarStyle: { backgroundColor: '#fbf8ef' } }}>
    <Tabs.Screen name="index" options={{ title: 'Shopora', tabBarLabel: 'Shop', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>✳</Text> }} />
    <Tabs.Screen name="cart" options={{ title: 'Your cart', tabBarLabel: 'Cart', tabBarBadge: quantity || undefined, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▣</Text> }} />
    <Tabs.Screen name="account" options={{ title: 'Your account', tabBarLabel: 'Account', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>○</Text> }} />
  </Tabs>;
}
