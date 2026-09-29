import type { Task, TaskFilter } from './types';

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  if (filter === 'active') return tasks.filter((task) => !task.completed);
  if (filter === 'completed') return tasks.filter((task) => task.completed);
  return tasks;
}

export function formatReminder(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function parseTime(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem && (hour < 1 || hour > 12)) return null;
  if (!meridiem && hour > 23) return null;
  if (meridiem) hour = hour === 12 ? (meridiem === 'am' ? 0 : 12) : meridiem === 'pm' ? hour + 12 : hour;

  const result = new Date();
  result.setHours(hour, minute, 0, 0);
  if (result <= new Date()) result.setDate(result.getDate() + 1);
  return result;
}
