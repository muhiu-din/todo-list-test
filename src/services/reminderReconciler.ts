import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelTaskReminder, scheduleTaskReminder } from './notifications';
import type { Task } from '@/src/features/tasks/types';

const REMINDER_MAP_KEY = 'daymark-reminder-map-v2';

type StoredRecord = {
  notificationId: string;
  reminderAt: string;
  title: string;
  notes?: string | null;
};

type StoredMap = Record<string, StoredRecord>;
type ResultMap = Record<string, string>;

export async function reconcileTaskReminders(tasks: Task[]): Promise<ResultMap> {
  let previous: StoredMap = {};
  try {
    const stored = await AsyncStorage.getItem(REMINDER_MAP_KEY);
    if (stored) {
      previous = JSON.parse(stored) as StoredMap;
    }
  } catch {
    previous = {};
  }

  const nextStored: StoredMap = {};
  const nextResult: ResultMap = {};
  const currentTaskIds = new Set(tasks.map((task) => task.id));

  for (const task of tasks) {
    const date = task.reminderAt ? new Date(task.reminderAt) : null;
    const isFuture = Boolean(date && date.getTime() > Date.now());
    const shouldSchedule = isFuture && !task.completed;
    const prevRecord = previous[task.id];

    if (shouldSchedule && date) {
      // Check if unchanged
      if (
        prevRecord &&
        prevRecord.reminderAt === task.reminderAt &&
        prevRecord.title === task.title &&
        (prevRecord.notes ?? null) === (task.notes ?? null)
      ) {
        nextStored[task.id] = prevRecord;
        nextResult[task.id] = prevRecord.notificationId;
      } else {
        // Needs rescheduling (new task or reminder/title/notes changed)
        if (prevRecord?.notificationId) {
          await cancelTaskReminder(prevRecord.notificationId);
        }
        const notificationId = await scheduleTaskReminder(task.title, date, task.notes);
        if (notificationId) {
          const newRecord: StoredRecord = {
            notificationId,
            reminderAt: task.reminderAt!,
            title: task.title,
            notes: task.notes ?? null,
          };
          nextStored[task.id] = newRecord;
          nextResult[task.id] = notificationId;
        }
      }
    } else if (prevRecord?.notificationId) {
      // Task was completed or reminder was cleared/passed
      await cancelTaskReminder(prevRecord.notificationId);
    }
  }

  // Cancel any deleted tasks that were previously scheduled
  for (const [taskId, record] of Object.entries(previous)) {
    if (!currentTaskIds.has(taskId) && record?.notificationId) {
      await cancelTaskReminder(record.notificationId);
    }
  }

  try {
    await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(nextStored));
  } catch {
    // Ignore storage failure
  }

  return nextResult;
}

