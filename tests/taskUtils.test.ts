import { describe, expect, it } from 'vitest';
import { filterTasks, parseTime } from '../src/features/tasks/taskUtils';
import type { Task } from '../src/features/tasks/types';

const tasks: Task[] = [
  { id: 'one', title: 'Open task', notes: null, completed: false, reminderAt: null, notificationId: null, createdAt: 1 },
  { id: 'two', title: 'Done task', notes: 'Finished', completed: true, reminderAt: null, notificationId: null, createdAt: 2 },
];

describe('task utilities', () => {
  it('filters active and completed tasks', () => {
    expect(filterTasks(tasks, 'active').map((task) => task.id)).toEqual(['one']);
    expect(filterTasks(tasks, 'completed').map((task) => task.id)).toEqual(['two']);
    expect(filterTasks(tasks, 'all')).toHaveLength(2);
  });

  it('parses valid 12-hour and 24-hour times', () => {
    expect(parseTime('6:30 PM')).toBeInstanceOf(Date);
    expect(parseTime('18:30')).toBeInstanceOf(Date);
    expect(parseTime('not a time')).toBeNull();
  });
});
