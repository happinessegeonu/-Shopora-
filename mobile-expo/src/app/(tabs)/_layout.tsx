import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '../../lib/theme';
import { useStore } from '../../lib/store';

export default function TabLayout() {
  const { cart } = useStore();
  const quantity = cart.reduce((sum, line) => sum + line.quantity, 0);
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: theme.colors.paper }, headerTintColor: theme.colors.green, tabBarActiveTintColor: theme.colors.green, tabBarStyle: { backgroundColor: theme.colors.paper } }}>
    <Tabs.Screen name="index" options={{ title: 'shopora ✳', tabBarLabel: 'Shop', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>✳</Text> }} />
    <Tabs.Screen name="cart" options={{ title: 'Your bag', tabBarLabel: 'Cart', tabBarBadge: quantity || undefined, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>▣</Text> }} />
    <Tabs.Screen name="account" options={{ title: 'Your account', tabBarLabel: 'Account', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>○</Text> }} />
  </Tabs>;
}
