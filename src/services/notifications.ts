import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_CHANNEL_ID = 'reminders';

// Web timer storage for scheduled web alerts
const webTimers = new Map<string, number>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Task Reminders',
      description: 'Loud reminders for your scheduled tasks',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FF6F59',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
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
      gain.gain.setValueAtTime(0.15, start);
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

export async function scheduleTaskReminder(title: string, date: Date, notes?: string | null): Promise<string | null> {
  const triggerMillis = date.getTime();
  if (triggerMillis <= Date.now()) return null;

  try {
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
            new Notification('Daymark Reminder', {
              body: notes?.trim() ? `${title}\n${notes.trim()}` : title,
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

    const permission = await Notifications.getPermissionsAsync();
    let granted = permission.granted || permission.status === 'granted';
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
    if (!granted) return null;

    await setupNotificationChannels();

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daymark Reminder',
        body: notes?.trim() ? `${title} — ${notes.trim()}` : title,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 250, 500],
        badge: 1,
        data: { title, reminderAt: date.toISOString() },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
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

