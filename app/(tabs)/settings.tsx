import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { radii, spacing, typography } from '@/src/theme/tokens';
import { useTheme, type ThemeMode } from '@/src/theme/ThemeContext';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  testReminderInSeconds,
} from '@/src/services/notifications';

export default function SettingsScreen() {
  const { user, logOut, resetPassword } = useAuth();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0) + 14;

  const [busy, setBusy] = useState(false);
  const [testingReminder, setTestingReminder] = useState(false);
  const [message, setMessage] = useState('');
  const [notifPermission, setNotifPermission] = useState<string>('checking...');

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Daymark user';
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    getNotificationPermissionStatus().then((status) => {
      setNotifPermission(status);
    });
  }, []);

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

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermissions();
    setNotifPermission(granted ? 'granted' : 'denied');
    setMessage(granted ? 'Notification permissions enabled!' : 'Permission denied. Please enable notifications in device settings.');
  }

  async function handleTestNotification() {
    setTestingReminder(true);
    setMessage('Scheduling test notification for 5 seconds from now...');
    const id = await testReminderInSeconds(5);
    setTestingReminder(false);
    if (id) {
      setMessage('Scheduled! Lock your screen or wait 5 seconds to hear the chime/ring.');
    } else {
      setMessage('Failed to schedule. Check notification permissions above.');
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.paper, paddingTop: topInset }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.coral }]}>YOUR ACCOUNT</Text>
      <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>

      {/* Profile Card */}
      <View style={[styles.profileCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.mint }]}>
          <Text style={[styles.avatarText, { color: colors.mintText }]}>{initials}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={[styles.name, { color: colors.ink }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.muted }]}>{user?.email}</Text>
        </View>
      </View>

      {/* Appearance / Theme Toggle */}
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>APPEARANCE</Text>
      <View style={[styles.themeCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
        <View style={styles.themeHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.coralMuted }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={19} color={colors.coral} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={[styles.actionTitle, { color: colors.ink }]}>Theme</Text>
            <Text style={[styles.actionHint, { color: colors.muted }]}>
              Currently in {isDark ? 'Dark' : 'Light'} mode
            </Text>
          </View>
        </View>

        <View style={[styles.themeOptions, { backgroundColor: colors.paper }]}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
            const active = themeMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setThemeMode(mode)}
                style={[
                  styles.themeButton,
                  active && [styles.themeButtonActive, { backgroundColor: colors.card }],
                ]}
              >
                <Ionicons
                  name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                  size={15}
                  color={active ? colors.coral : colors.muted}
                />
                <Text
                  style={[
                    styles.themeButtonText,
                    { color: colors.muted },
                    active && [styles.themeButtonTextActive, { color: colors.ink }],
                  ]}
                >
                  {mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notifications & Reminders section */}
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>REMINDERS & NOTIFICATIONS</Text>
      <View style={[styles.cardGroup, { borderColor: colors.line, backgroundColor: colors.card }]}>
        <Pressable
          onPress={handleEnableNotifications}
          style={[styles.actionRow, { borderBottomColor: colors.line }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.mint }]}>
            <Ionicons name="notifications-outline" size={19} color={colors.mintText} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={[styles.actionTitle, { color: colors.ink }]}>Notification Permissions</Text>
            <Text style={[styles.actionHint, { color: colors.muted }]}>
              Status: {notifPermission.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.actionBadge, { color: notifPermission === 'granted' ? colors.mintText : colors.coral }]}>
            {notifPermission === 'granted' ? 'Allowed' : 'Enable'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleTestNotification}
          disabled={testingReminder}
          style={styles.actionRow}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.coralMuted }]}>
            <Ionicons name="volume-high-outline" size={19} color={colors.coral} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={[styles.actionTitle, { color: colors.ink }]}>Test Reminder (5s)</Text>
            <Text style={[styles.actionHint, { color: colors.muted }]}>
              Verify alarm ringing and notification display
            </Text>
          </View>
          <Ionicons name="play" size={16} color={colors.coral} />
        </Pressable>
      </View>

      {/* Account Section */}
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>ACCOUNT</Text>
      <Pressable
        accessibilityLabel="Change password"
        onPress={sendPasswordReset}
        disabled={busy}
        style={[styles.singleActionRow, { borderColor: colors.line, backgroundColor: colors.card }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.coralMuted }]}>
          <Ionicons name="key-outline" size={19} color={colors.coral} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={[styles.actionTitle, { color: colors.ink }]}>Change password</Text>
          <Text style={[styles.actionHint, { color: colors.muted }]}>Send a secure reset link to your email</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {message ? <Text style={[styles.message, { color: colors.coral }]}>{message}</Text> : null}

      <Pressable
        accessibilityLabel="Log out"
        onPress={handleLogout}
        disabled={busy}
        style={[
          styles.logoutButton,
          { borderColor: colors.line, backgroundColor: colors.dangerBg },
          busy && styles.disabled,
        ]}
      >
        <Ionicons name="log-out-outline" size={19} color={colors.danger} />
        <Text style={[styles.logoutText, { color: colors.danger }]}>{busy ? 'Please wait...' : 'Log out'}</Text>
      </Pressable>

      <Text style={[styles.version, { color: colors.muted }]}>DAYMARK / ACCOUNT · v1.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl },
  eyebrow: { fontSize: typography.label, fontWeight: '700', letterSpacing: 1.8 },
  title: { marginTop: spacing.sm, fontSize: 34, fontWeight: '800' },
  profileCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  profileCopy: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 16, fontWeight: '700' },
  email: { marginTop: spacing.xs, fontSize: typography.caption },
  sectionLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  themeCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeOptions: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.sm,
    marginTop: spacing.md,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.sm,
  },
  themeButtonActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  themeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  themeButtonTextActive: {
    fontWeight: '700',
  },
  cardGroup: {
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  actionRow: {
    minHeight: 68,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  singleActionRow: {
    minHeight: 72,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, marginHorizontal: spacing.md },
  actionTitle: { fontSize: typography.body, fontWeight: '700' },
  actionHint: { marginTop: spacing.xs, fontSize: typography.caption },
  actionBadge: {
    fontSize: typography.caption,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  message: { marginTop: spacing.md, fontSize: typography.caption, textAlign: 'center' },
  logoutButton: {
    height: 52,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  logoutText: { fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  version: {
    marginTop: spacing.xl,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
