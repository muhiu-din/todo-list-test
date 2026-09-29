import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelTaskReminder, scheduleTaskReminder } from './notifications';
import type { Task } from '@/src/features/tasks/types';

const REMINDER_MAP_KEY = 'daymark-reminder-map';

type ReminderMap = Record<string, string>;

export async function reconcileTaskReminders(tasks: Task[]): Promise<ReminderMap> {
  const stored = await AsyncStorage.getItem(REMINDER_MAP_KEY);
  const previous: ReminderMap = stored ? JSON.parse(stored) as ReminderMap : {};
  const next: ReminderMap = {};
  const taskIds = new Set(tasks.map((task) => task.id));

  for (const task of tasks) {
    const date = task.reminderAt ? new Date(task.reminderAt) : null;
    const shouldSchedule = Boolean(date && date > new Date() && !task.completed);
    const previousNotificationId = previous[task.id];
    if (shouldSchedule && previousNotificationId) {
      next[task.id] = previousNotificationId;
    } else if (shouldSchedule && date) {
      const notificationId = await scheduleTaskReminder(task.title, date);
      if (notificationId) next[task.id] = notificationId;
    } else if (previousNotificationId) {
      await cancelTaskReminder(previousNotificationId);
    }
  }

  for (const [taskId, notificationId] of Object.entries(previous)) {
    if (!taskIds.has(taskId)) await cancelTaskReminder(notificationId);
  }

  await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(next));
  return next;
}
