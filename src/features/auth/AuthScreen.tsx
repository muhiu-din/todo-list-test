import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from './AuthProvider';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthScreen() {
  const { configured, error, signIn, signInGoogle, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      setBusy(true);
      signInGoogle(response.authentication.accessToken).finally(() => setBusy(false));
    }
  }, [response, signInGoogle]);

  async function submit() {
    setMessage('');
    if (!email.trim()) return setMessage('Enter your email address.');
    if (mode === 'signup' && !displayName.trim()) return setMessage('Enter your display name.');
    if (mode !== 'forgot' && password.length < 6) return setMessage('Use a password with at least 6 characters.');

    setBusy(true);
    const succeeded = mode === 'login'
      ? await signIn(email, password)
      : mode === 'signup'
        ? await signUp(email, password, displayName)
        : await resetPassword(email);
    setBusy(false);
    if (succeeded && mode === 'forgot') setMessage('Check your email for a password reset link.');
  }

  async function signInWithGoogle() {
    setMessage('');
    if (!request) {
      setMessage('Add the Google OAuth client IDs to .env first.');
      return;
    }
    await promptAsync();
  }

  return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled"><View style={styles.card}>
    <View style={styles.brandMark}><Text style={styles.brandMarkText}>*</Text></View>
    <Text style={styles.brand}>daymark</Text>
    <Text style={styles.eyebrow}>{mode === 'signup' ? 'CREATE YOUR ACCOUNT' : mode === 'forgot' ? 'RESET YOUR PASSWORD' : 'WELCOME BACK'}</Text>
    <Text style={styles.title}>{mode === 'signup' ? 'Make space together.' : mode === 'forgot' ? 'Back in your rhythm.' : 'Make space for\nwhat matters.'}</Text>
    <Text style={styles.subtitle}>{configured ? 'Sign in to keep your tasks close.' : 'Firebase setup is needed before accounts can be used.'}</Text>

    {!configured ? <View style={styles.setupCard}><Text style={styles.setupTitle}>Firebase is not configured</Text><Text style={styles.setupCopy}>Add the EXPO_PUBLIC_FIREBASE values from .env, then restart Expo.</Text></View> : <>
      {mode === 'signup' && <TextInput accessibilityLabel="Display name" autoCapitalize="words" placeholder="Display name" placeholderTextColor="#9BA6A1" style={styles.input} value={displayName} onChangeText={setDisplayName} />}
      <TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address" placeholderTextColor="#9BA6A1" style={styles.input} value={email} onChangeText={setEmail} />
      {mode !== 'forgot' && <TextInput accessibilityLabel="Password" autoCapitalize="none" secureTextEntry placeholder="Password" placeholderTextColor="#9BA6A1" style={styles.input} value={password} onChangeText={setPassword} />}
      {(message || error) && <Text style={styles.error}>{message || error}</Text>}
      <Pressable accessibilityLabel={mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset email' : 'Sign in'} disabled={busy} onPress={submit} style={styles.primaryButton}><Text style={styles.primaryText}>{busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset email' : 'Sign in'}</Text></Pressable>
      {mode !== 'forgot' && <><View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View><Pressable accessibilityLabel="Continue with Google" disabled={busy} onPress={signInWithGoogle} style={styles.googleButton}><Text style={styles.googleIcon}>G</Text><Text style={styles.googleText}>Continue with Google</Text></Pressable></>}
      {mode === 'login' && <Pressable onPress={() => setMode('forgot')} style={styles.linkButton}><Text style={styles.linkText}>Forgot password?</Text></Pressable>}
      <Pressable onPress={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage(''); }} style={styles.linkButton}><Text style={styles.linkText}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text></Pressable>
      {mode === 'forgot' && <Pressable onPress={() => setMode('login')} style={styles.linkButton}><Text style={styles.linkText}>Back to sign in</Text></Pressable>}
    </>}
  </View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  keyboard: { flex: 1 },
  container: { flexGrow: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 460, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: 20, backgroundColor: colors.white },
  brandMark: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  brandMarkText: { color: colors.white, fontSize: 18 },
  brand: { marginTop: spacing.sm, color: colors.ink, fontSize: 21, fontWeight: '700' },
  eyebrow: { marginTop: spacing.xxl, marginBottom: spacing.sm, color: colors.coral, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.8 },
  title: { color: colors.ink, fontSize: 36, lineHeight: 40, fontWeight: '700' },
  subtitle: { marginTop: spacing.md, marginBottom: spacing.lg, color: colors.muted, fontSize: typography.body, lineHeight: 21 },
  input: { height: 54, marginBottom: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.sm, backgroundColor: colors.white, color: colors.ink, fontSize: typography.body },
  primaryButton: { height: 54, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.ink },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  googleButton: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radii.sm, backgroundColor: colors.white },
  googleIcon: { color: '#4285F4', fontSize: 18, fontWeight: '800' },
  googleText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  linkButton: { alignItems: 'center', paddingVertical: spacing.sm },
  linkText: { color: colors.coral, fontSize: typography.caption, fontWeight: '700' },
  error: { marginBottom: spacing.sm, color: colors.danger, fontSize: typography.caption, lineHeight: 16 },
  setupCard: { padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.white },
  setupTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '700' },
  setupCopy: { marginTop: spacing.xs, color: colors.muted, fontSize: typography.caption, lineHeight: 16 },
});
