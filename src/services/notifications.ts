import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleTaskReminder(title: string, date: Date): Promise<string | null> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    const granted = permission.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Task reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Daymark reminder', body: title, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    return null;
  }
}

export async function cancelTaskReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
  }
}
