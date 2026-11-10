import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelTaskReminder, scheduleTaskReminder } from './notifications';
import type { Task } from '@/src/features/tasks/types';

const REMINDER_MAP_KEY = 'daymark-reminder-map-v3';

type StoredRecord = {
  notificationId: string;
  reminderAt: string;
  title: string;
  notes?: string | null;
  scope: string;
};

type StoredMap = Record<string, StoredRecord>;
type ResultMap = Record<string, string>;

export async function reconcileTaskReminders(
  tasks: Task[],
  scope = 'personal',
  contextPrefix?: string | null
): Promise<ResultMap> {
  let allStored: StoredMap = {};
  try {
    const raw = await AsyncStorage.getItem(REMINDER_MAP_KEY);
    if (raw) {
      allStored = JSON.parse(raw) as StoredMap;
    }
  } catch {
    allStored = {};
  }

  // Filter existing records for this specific scope
  const previousInScope: StoredMap = {};
  const otherScopes: StoredMap = {};

  for (const [key, record] of Object.entries(allStored)) {
    const recordScope = record.scope || 'personal';
    if (recordScope === scope) {
      previousInScope[key] = record;
    } else {
      otherScopes[key] = record;
    }
  }

  const nextInScope: StoredMap = {};
  const nextResult: ResultMap = {};
  const currentTaskIds = new Set(tasks.map((task) => task.id));

  for (const task of tasks) {
    const date = task.reminderAt ? new Date(task.reminderAt) : null;
    const isFuture = Boolean(date && date.getTime() > Date.now());
    const shouldSchedule = isFuture && !task.completed;
    const prevRecord = previousInScope[task.id];

    if (shouldSchedule && date) {
      if (
        prevRecord &&
        prevRecord.reminderAt === task.reminderAt &&
        prevRecord.title === task.title &&
        (prevRecord.notes ?? null) === (task.notes ?? null)
      ) {
        // Unchanged, retain notification
        nextInScope[task.id] = prevRecord;
        nextResult[task.id] = prevRecord.notificationId;
      } else {
        // Cancel previous if any, and schedule newly
        if (prevRecord?.notificationId) {
          await cancelTaskReminder(prevRecord.notificationId);
        }
        const notificationId = await scheduleTaskReminder(task.title, date, task.notes, contextPrefix);
        if (notificationId) {
          const newRecord: StoredRecord = {
            notificationId,
            reminderAt: task.reminderAt!,
            title: task.title,
            notes: task.notes ?? null,
            scope,
          };
          nextInScope[task.id] = newRecord;
          nextResult[task.id] = notificationId;
        }
      }
    } else if (prevRecord?.notificationId) {
      // Completed, cleared, or past reminder
      await cancelTaskReminder(prevRecord.notificationId);
    }
  }

  // Cancel any deleted tasks in THIS scope only
  for (const [taskId, record] of Object.entries(previousInScope)) {
    if (!currentTaskIds.has(taskId) && record?.notificationId) {
      await cancelTaskReminder(record.notificationId);
    }
  }

  // Combine this scope with other scopes and persist
  const combined: StoredMap = { ...otherScopes, ...nextInScope };
  try {
    await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(combined));
  } catch {
    // Ignore storage failure
  }

  return nextResult;
}

export async function cancelScopeReminders(scope: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_MAP_KEY);
    if (!raw) return;
    const allStored = JSON.parse(raw) as StoredMap;
    const remaining: StoredMap = {};

    for (const [key, record] of Object.entries(allStored)) {
      if ((record.scope || 'personal') === scope) {
        if (record.notificationId) {
          await cancelTaskReminder(record.notificationId);
        }
      } else {
        remaining[key] = record;
      }
    }

    await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(remaining));
  } catch {
    // Ignore storage failure
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_MAP_KEY);
    if (!raw) return;
    const allStored = JSON.parse(raw) as StoredMap;
    for (const record of Object.values(allStored)) {
      if (record.notificationId) {
        await cancelTaskReminder(record.notificationId);
      }
    }
    await AsyncStorage.removeItem(REMINDER_MAP_KEY);
  } catch {
    // Ignore storage failure
  }
}
