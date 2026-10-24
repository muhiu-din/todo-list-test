import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '@/src/theme/tokens';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => NetInfo.addEventListener((state) => setOffline(state.isConnected === false)), []);
  if (!offline) return null;
  return <View accessibilityRole="alert" style={styles.banner}><Text style={styles.text}>You are offline. Changes will sync when you reconnect.</Text></View>;
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: '#FFF2D8' },
  text: { color: '#805A1B', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
