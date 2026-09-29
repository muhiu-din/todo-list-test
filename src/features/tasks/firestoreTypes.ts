import type { Timestamp } from 'firebase/firestore';

export type FirestoreTask = {
  title: string;
  notes: string | null;
  completed: boolean;
  completedBy: string | null;
  completedAt: Timestamp | null;
  createdBy: string;
  assigneeId: string | null;
  dueAt: Timestamp | null;
  reminderAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
