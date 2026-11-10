import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthGate } from '@/src/features/auth/AuthGate';
import { AuthProvider } from '@/src/features/auth/AuthProvider';
import { ThemeProvider } from '@/src/theme/ThemeContext';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { requestNotificationPermissions, setupNotificationChannels } from '@/src/services/notifications';

export default function RootLayout() {
  useEffect(() => {
    setupNotificationChannels().catch(() => undefined);
    requestNotificationPermissions().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
