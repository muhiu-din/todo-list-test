import { AuthGate } from '@/src/features/auth/AuthGate';
import { AuthProvider } from '@/src/features/auth/AuthProvider';

export default function RootLayout() {
  return <AuthProvider><AuthGate /></AuthProvider>;
}
