import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../src/features/tasks/types';

// Mock AsyncStorage
const storageMap: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storageMap[key] ?? null),
    setItem: vi.fn(async (key: string, val: string) => {
      storageMap[key] = val;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete storageMap[key];
    }),
  },
}));

// Mock notifications service
const scheduledNotifications: Array<{ title: string; date: Date; notes?: string | null; prefix?: string | null; id: string }> = [];
const cancelledIds: string[] = [];

vi.mock('../src/services/notifications', () => ({
  scheduleTaskReminder: vi.fn(async (title: string, date: Date, notes?: string | null, prefix?: string | null) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    scheduledNotifications.push({ title, date, notes, prefix, id });
    return id;
  }),
  cancelTaskReminder: vi.fn(async (id: string | null) => {
    if (id) cancelledIds.push(id);
  }),
}));

import {
  cancelScopeReminders,
  reconcileTaskReminders,
} from '../src/services/reminderReconciler';

describe('reminderReconciler with multi-scope support', () => {
  beforeEach(() => {
    for (const key of Object.keys(storageMap)) {
      delete storageMap[key];
    }
    scheduledNotifications.length = 0;
    cancelledIds.length = 0;
  });

  it('schedules future tasks for personal scope', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Review proposal',
        notes: null,
        completed: false,
        reminderAt: futureDate,
        notificationId: null,
        createdAt: Date.now(),
      },
    ];

    const result = await reconcileTaskReminders(tasks, 'personal');
    expect(result['task-1']).toBeDefined();
    expect(scheduledNotifications).toHaveLength(1);
    expect(scheduledNotifications[0]?.title).toBe('Review proposal');
  });

  it('keeps personal reminders when reconciling team tasks (no cross-scope wiping)', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const personalTasks: Task[] = [
      {
        id: 'pers-1',
        title: 'Personal task',
        notes: null,
        completed: false,
        reminderAt: futureDate,
        notificationId: null,
        createdAt: Date.now(),
      },
    ];

    // Reconcile personal
    const persResult = await reconcileTaskReminders(personalTasks, 'personal');
    const persNotifId = persResult['pers-1'];
    expect(persNotifId).toBeDefined();

    // Reconcile a team list
    const teamTasks: Task[] = [
      {
        id: 'team-1',
        title: 'Team task',
        notes: null,
        completed: false,
        reminderAt: futureDate,
        notificationId: null,
        createdAt: Date.now(),
      },
    ];

    const teamResult = await reconcileTaskReminders(teamTasks, 'team:t1:l1', 'Core Team');
    expect(teamResult['team-1']).toBeDefined();

    // Personal notification must NOT have been cancelled!
    expect(cancelledIds).not.toContain(persNotifId);

    // Re-reconciling personal list should keep its existing notification id
    const persRecheck = await reconcileTaskReminders(personalTasks, 'personal');
    expect(persRecheck['pers-1']).toBe(persNotifId);
  });

  it('cancels notification when task is completed or deleted in its scope', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const tasks: Task[] = [
      {
        id: 'task-del',
        title: 'To be completed',
        notes: null,
        completed: false,
        reminderAt: futureDate,
        notificationId: null,
        createdAt: Date.now(),
      },
    ];

    const res = await reconcileTaskReminders(tasks, 'personal');
    const notifId = res['task-del'];
    expect(notifId).toBeDefined();

    // Mark completed
    const updatedTasks: Task[] = [{ ...tasks[0]!, completed: true }];
    await reconcileTaskReminders(updatedTasks, 'personal');
    expect(cancelledIds).toContain(notifId);
  });

  it('cancels all reminders for a specific scope when leaving team', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const teamTasks: Task[] = [
      {
        id: 'team-task-1',
        title: 'Team task',
        notes: null,
        completed: false,
        reminderAt: futureDate,
        notificationId: null,
        createdAt: Date.now(),
      },
    ];

    const teamRes = await reconcileTaskReminders(teamTasks, 'team:alpha:l1', 'Alpha');
    const notifId = teamRes['team-task-1'];
    expect(notifId).toBeDefined();

    await cancelScopeReminders('team:alpha:l1');
    expect(cancelledIds).toContain(notifId);
  });
});
