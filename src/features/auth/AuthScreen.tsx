import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from './AuthProvider';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useTheme } from '@/src/theme/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthScreen() {
  const { configured, error, signIn, signInGoogle, signUp, resetPassword } = useAuth();
  const { colors } = useTheme();

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
    const succeeded =
      mode === 'login'
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.paper }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }]}>
            <View style={[styles.brandMark, { backgroundColor: colors.ink }]}>
              <Text style={[styles.brandMarkText, { color: colors.card }]}>*</Text>
            </View>
            <Text style={[styles.brand, { color: colors.ink }]}>daymark</Text>
            <Text style={[styles.eyebrow, { color: colors.coral }]}>
              {mode === 'signup'
                ? 'CREATE YOUR ACCOUNT'
                : mode === 'forgot'
                ? 'RESET YOUR PASSWORD'
                : 'WELCOME BACK'}
            </Text>
            <Text style={[styles.title, { color: colors.ink }]}>
              {mode === 'signup'
                ? 'Make space together.'
                : mode === 'forgot'
                ? 'Back in your rhythm.'
                : 'Make space for\nwhat matters.'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {configured ? 'Sign in to keep your tasks close.' : 'Firebase setup is needed before accounts can be used.'}
            </Text>

            {!configured ? (
              <View style={[styles.setupCard, { borderColor: colors.line, backgroundColor: colors.paper }]}>
                <Text style={[styles.setupTitle, { color: colors.ink }]}>Firebase is not configured</Text>
                <Text style={[styles.setupCopy, { color: colors.muted }]}>
                  Add the EXPO_PUBLIC_FIREBASE values from .env, then restart Expo.
                </Text>
              </View>
            ) : (
              <>
                {mode === 'signup' && (
                  <TextInput
                    accessibilityLabel="Display name"
                    autoCapitalize="words"
                    placeholder="Display name"
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        color: colors.ink,
                        borderColor: colors.line,
                      },
                    ]}
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                )}
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="Email address"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.ink,
                      borderColor: colors.line,
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                />
                {mode !== 'forgot' && (
                  <TextInput
                    accessibilityLabel="Password"
                    autoCapitalize="none"
                    secureTextEntry
                    placeholder="Password"
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        color: colors.ink,
                        borderColor: colors.line,
                      },
                    ]}
                    value={password}
                    onChangeText={setPassword}
                  />
                )}
                {message || error ? <Text style={[styles.error, { color: colors.danger }]}>{message || error}</Text> : null}
                <Pressable
                  accessibilityLabel={mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset email' : 'Sign in'}
                  disabled={busy}
                  onPress={submit}
                  style={[styles.primaryButton, { backgroundColor: colors.ink }]}
                >
                  <Text style={[styles.primaryText, { color: colors.card }]}>
                    {busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset email' : 'Sign in'}
                  </Text>
                </Pressable>
                {mode !== 'forgot' && (
                  <>
                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
                      <Text style={[styles.dividerText, { color: colors.muted }]}>OR</Text>
                      <View style={[styles.dividerLine, { backgroundColor: colors.line }]} />
                    </View>
                    <Pressable
                      accessibilityLabel="Continue with Google"
                      disabled={busy}
                      onPress={signInWithGoogle}
                      style={[styles.googleButton, { borderColor: colors.line, backgroundColor: colors.card }]}
                    >
                      <Text style={styles.googleIcon}>G</Text>
                      <Text style={[styles.googleText, { color: colors.ink }]}>Continue with Google</Text>
                    </Pressable>
                  </>
                )}
                {mode === 'login' && (
                  <Pressable onPress={() => setMode('forgot')} style={styles.linkButton}>
                    <Text style={[styles.linkText, { color: colors.coral }]}>Forgot password?</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setMode(mode === 'signup' ? 'login' : 'signup');
                    setMessage('');
                  }}
                  style={styles.linkButton}
                >
                  <Text style={[styles.linkText, { color: colors.coral }]}>
                    {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
                  </Text>
                </Pressable>
                {mode === 'forgot' && (
                  <Pressable onPress={() => setMode('login')} style={styles.linkButton}>
                    <Text style={[styles.linkText, { color: colors.coral }]}>Back to sign in</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  container: { flexGrow: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 460, padding: spacing.xl, borderWidth: 1, borderRadius: 20 },
  brandMark: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontSize: 18, fontWeight: '700' },
  brand: { marginTop: spacing.sm, fontSize: 21, fontWeight: '800' },
  eyebrow: { marginTop: spacing.xxl, marginBottom: spacing.sm, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.8 },
  title: { fontSize: 36, lineHeight: 40, fontWeight: '800' },
  subtitle: { marginTop: spacing.md, marginBottom: spacing.lg, fontSize: typography.body, lineHeight: 21 },
  input: { height: 54, marginBottom: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.sm, fontSize: typography.body, borderWidth: 1 },
  primaryButton: { height: 54, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  primaryText: { fontSize: 14, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontWeight: '700' },
  googleButton: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radii.sm },
  googleIcon: { color: '#4285F4', fontSize: 18, fontWeight: '800' },
  googleText: { fontSize: 14, fontWeight: '700' },
  linkButton: { alignItems: 'center', paddingVertical: spacing.sm },
  linkText: { fontSize: typography.caption, fontWeight: '700' },
  error: { marginBottom: spacing.sm, fontSize: typography.caption, lineHeight: 16 },
  setupCard: { padding: spacing.md, borderWidth: 1, borderRadius: radii.md },
  setupTitle: { fontSize: typography.body, fontWeight: '700' },
  setupCopy: { marginTop: spacing.xs, fontSize: typography.caption, lineHeight: 16 },
});
