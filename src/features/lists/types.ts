import type { Timestamp } from 'firebase/firestore';

export type ListScope = 'personal' | 'team';

export type TaskList = {
  id: string;
  name: string;
  scope: ListScope;
  ownerId?: string;
  teamId?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
