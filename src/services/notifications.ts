import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const REMINDER_CHANNEL_ID = 'reminders';

// Web timer storage for scheduled web alerts
const webTimers = new Map<string, number>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Task Reminders',
        description: 'Loud audible reminders for scheduled tasks',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF6F59',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
    } catch (error) {
      console.warn('Failed to set notification channel:', error);
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      try {
        const result = await Notification.requestPermission();
        return result === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted || existing.status === 'granted';
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      granted = requested.granted || requested.status === 'granted';
    }
    return granted;
  } catch (error) {
    console.warn('Could not request notification permissions:', error);
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'undetermined';
    }
    return 'granted';
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted || permission.status === 'granted') return 'granted';
    if (permission.status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

function playWebChime() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(587.33, now, 0.25); // D5
    playTone(880, now + 0.15, 0.4); // A5
  } catch {
    // Ignore web audio restrictions
  }
}

export async function scheduleTaskReminder(
  title: string,
  date: Date,
  notes?: string | null,
  contextPrefix?: string | null
): Promise<string | null> {
  const triggerMillis = date.getTime();
  if (triggerMillis <= Date.now()) return null;

  try {
    const displayTitle = contextPrefix ? `[${contextPrefix}] Daymark Reminder` : 'Daymark Reminder';
    const displayBody = notes?.trim() ? `${title} — ${notes.trim()}` : title;

    if (Platform.OS === 'web') {
      const id = `web-notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const delay = Math.max(0, triggerMillis - Date.now());

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      }

      const timerId = window.setTimeout(() => {
        webTimers.delete(id);
        playWebChime();
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(displayTitle, {
              body: displayBody,
              icon: '/favicon.ico',
            });
          } catch {
            // fallback handled
          }
        }
      }, delay);

      webTimers.set(id, timerId);
      return id;
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.warn('Cannot schedule reminder: Notification permission not granted');
      return null;
    }

    await setupNotificationChannels();

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: displayTitle,
        body: displayBody,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        badge: 1,
        data: { title, notes, reminderAt: date.toISOString(), context: contextPrefix ?? null },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerMillis),
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch (error) {
    console.warn('Failed to schedule reminder:', error);
    return null;
  }
}

export async function cancelTaskReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;

  if (Platform.OS === 'web' && webTimers.has(notificationId)) {
    const timerId = webTimers.get(notificationId);
    if (timerId !== undefined) clearTimeout(timerId);
    webTimers.delete(notificationId);
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ignore cancellation errors
  }
}

export async function testReminderInSeconds(seconds = 5): Promise<string | null> {
  const triggerDate = new Date(Date.now() + seconds * 1000);
  return await scheduleTaskReminder('Test Reminder', triggerDate, 'Ringing works! Your reminders are active.');
}
