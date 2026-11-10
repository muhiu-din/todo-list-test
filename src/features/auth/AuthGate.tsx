import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Slot } from 'expo-router';
import { AuthScreen } from './AuthScreen';
import { useAuth } from './AuthProvider';
import { useTheme } from '@/src/theme/ThemeContext';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { useTeamReminderSync } from '@/src/services/teamReminderSyncer';

export function AuthGate() {
  const { loading, user } = useAuth();
  const { colors } = useTheme();

  // Sync team task reminders globally in background for all team members
  useTeamReminderSync(user);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.paper }]}>
        <ActivityIndicator color={colors.coral} size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <View style={[styles.app, { backgroundColor: colors.paper }]}>
      <OfflineBanner />
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
