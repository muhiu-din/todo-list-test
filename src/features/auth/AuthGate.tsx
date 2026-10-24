import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthScreen } from './AuthScreen';
import { useAuth } from './AuthProvider';
import { colors } from '@/src/theme/tokens';
import { Slot } from 'expo-router';
import { OfflineBanner } from '@/src/components/OfflineBanner';

export function AuthGate() {
  const { loading, user } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.coral} /></View>;
  if (!user) return <AuthScreen />;
  return <View style={styles.app}><OfflineBanner /><Slot /></View>;
}

const styles = StyleSheet.create({ app: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper } });
