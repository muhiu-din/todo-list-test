import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';

export default function SettingsScreen() {
  const { user, logOut, resetPassword } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Daymark user';
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  async function sendPasswordReset() {
    if (!user?.email) return;
    setBusy(true);
    const succeeded = await resetPassword(user.email);
    setBusy(false);
    setMessage(succeeded ? 'Password reset email sent.' : 'Could not send the reset email. Try again.');
  }

  async function handleLogout() {
    setBusy(true);
    await logOut();
    setBusy(false);
  }

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
    <Text style={styles.title}>Settings</Text>
    <View style={styles.profileCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <View style={styles.profileCopy}><Text style={styles.name}>{displayName}</Text><Text style={styles.email}>{user?.email}</Text></View>
    </View>
    <Text style={styles.sectionLabel}>ACCOUNT</Text>
    <Pressable accessibilityLabel="Change password" onPress={sendPasswordReset} disabled={busy} style={styles.actionRow}><View style={styles.iconWrap}><Ionicons name="key-outline" size={19} color={colors.coral} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Change password</Text><Text style={styles.actionHint}>Send a secure reset link to your email</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>
    {message && <Text style={styles.message}>{message}</Text>}
    <Pressable accessibilityLabel="Log out" onPress={handleLogout} disabled={busy} style={[styles.logoutButton, busy && styles.disabled]}><Ionicons name="log-out-outline" size={19} color={colors.danger} /><Text style={styles.logoutText}>{busy ? 'Please wait...' : 'Log out'}</Text></Pressable>
    <Text style={styles.version}>DAYMARK / ACCOUNT · v1.0.0</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, backgroundColor: colors.paper },
  eyebrow: { color: colors.coral, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, color: colors.ink, fontSize: 34, fontWeight: '700' },
  profileCard: { marginTop: spacing.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radii.lg, backgroundColor: colors.white },
  avatar: { width: 54, height: 54, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint },
  avatarText: { color: '#557362', fontSize: 18, fontWeight: '800' },
  profileCopy: { flex: 1, marginLeft: spacing.md },
  name: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  email: { marginTop: spacing.xs, color: colors.muted, fontSize: typography.caption },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm, color: colors.muted, fontSize: typography.label, fontWeight: '700', letterSpacing: 1.5 },
  actionRow: { minHeight: 72, padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.white },
  iconWrap: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBE9E5' },
  actionCopy: { flex: 1, marginHorizontal: spacing.md },
  actionTitle: { color: colors.ink, fontSize: typography.body, fontWeight: '700' },
  actionHint: { marginTop: spacing.xs, color: colors.muted, fontSize: typography.caption },
  message: { marginTop: spacing.sm, color: '#557362', fontSize: typography.caption },
  logoutButton: { height: 52, marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: '#F1C8C1', borderRadius: radii.sm, backgroundColor: '#FFF8F6' },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  version: { marginTop: spacing.xl, color: '#9CA9A2', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' },
});
