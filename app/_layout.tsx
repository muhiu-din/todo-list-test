import { useEffect } from 'react';
import { AuthGate } from '@/src/features/auth/AuthGate';
import { AuthProvider } from '@/src/features/auth/AuthProvider';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { setupNotificationChannels } from '@/src/services/notifications';

export default function RootLayout() {
  useEffect(() => {
    setupNotificationChannels().catch(() => undefined);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}

