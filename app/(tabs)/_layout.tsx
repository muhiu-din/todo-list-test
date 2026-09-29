import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/tokens';

export default function TabsLayout() {
  return <Tabs screenOptions={{ tabBarActiveTintColor: colors.coral, tabBarInactiveTintColor: colors.muted, headerShown: false }}>
    <Tabs.Screen name="index" options={{ title: 'My Day', tabBarIcon: ({ color, size }) => <Ionicons name="sunny-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="teams" options={{ title: 'Teams', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
  </Tabs>;
}
