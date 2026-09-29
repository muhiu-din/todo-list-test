import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthScreen } from './AuthScreen';
import { useAuth } from './AuthProvider';
import { colors } from '@/src/theme/tokens';
import { Slot } from 'expo-router';

export function AuthGate() {
  const { loading, user } = useAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.coral} /></View>;
  if (!user) return <AuthScreen />;
  return <Slot />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper } });
