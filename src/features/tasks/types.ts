export type TaskFilter = 'all' | 'active' | 'completed';

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  completed: boolean;
  reminderAt: string | null;
  notificationId: string | null;
  createdAt: number;
};
