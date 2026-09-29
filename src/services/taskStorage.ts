import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '@/src/features/tasks/types';

const TASKS_STORAGE_KEY = 'daymark-tasks';

export async function loadLocalTasks(): Promise<Task[]> {
  const stored = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isTask);
}

export async function saveLocalTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<Task>;
  return typeof task.id === 'string' && typeof task.title === 'string' && typeof task.completed === 'boolean';
}
