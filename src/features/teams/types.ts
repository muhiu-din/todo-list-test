import type { Timestamp } from 'firebase/firestore';

export type TeamRole = 'owner' | 'member';

export type Team = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TeamMember = {
  uid: string;
  displayName: string;
  email: string;
  avatarColor: string;
  role: TeamRole;
  joinedAt: Timestamp;
  joinedWithCode: string;
};
