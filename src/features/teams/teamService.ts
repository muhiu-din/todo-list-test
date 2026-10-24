import { addDoc, arrayRemove, arrayUnion, collection, doc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb } from '@/src/services/firebase/client';
import type { Team, TeamMember } from './types';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 6): string {
  let code = '';
  for (let index = 0; index < length; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export async function createTeam(uid: string, name: string): Promise<string> {
  const db = getFirebaseDb();
  const inviteCode = generateInviteCode();
  const teamRef = await addDoc(collection(db, 'teams'), { name: name.trim(), ownerId: uid, memberIds: [uid], inviteCode, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await setDoc(doc(db, 'teams', teamRef.id, 'members', uid), { uid, role: 'owner', joinedWithCode: '', joinedAt: serverTimestamp() });
  await setDoc(doc(db, 'invites', inviteCode), { code: inviteCode, teamId: teamRef.id, createdBy: uid, active: true, createdAt: serverTimestamp() });
  return teamRef.id;
}

export function listenToUserTeams(uid: string, callback: (teams: Team[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(getFirebaseDb(), 'teams'), where('memberIds', 'array-contains', uid)), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Team))), onError);
}

export function listenToTeamMembers(teamId: string, callback: (members: TeamMember[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(getFirebaseDb(), 'teams', teamId, 'members'), (snapshot) => callback(snapshot.docs.map((item) => item.data() as TeamMember)), onError);
}

export async function joinTeamByCode(uid: string, code: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  const inviteSnapshot = await getDocs(query(collection(getFirebaseDb(), 'invites'), where('code', '==', normalizedCode), limit(1)));
  const invite = inviteSnapshot.docs[0];
  if (!invite) throw new Error('That invite code is invalid or expired.');
  const data = invite.data() as { teamId: string };
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'teams', data.teamId, 'members', uid), { uid, role: 'member', joinedWithCode: normalizedCode, joinedAt: serverTimestamp() });
  batch.update(doc(db, 'teams', data.teamId), { memberIds: arrayUnion(uid), updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function leaveTeam(teamId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'teams', teamId, 'members', uid));
  batch.update(doc(db, 'teams', teamId), { memberIds: arrayRemove(uid), updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function updateTeam(teamId: string, name: string): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'teams', teamId), { name: name.trim(), updatedAt: serverTimestamp() });
}

export async function deleteTeam(teamId: string, inviteCode: string): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  if (inviteCode) {
    batch.delete(doc(db, 'invites', inviteCode));
  }
  batch.delete(doc(db, 'teams', teamId));
  await batch.commit();
}

export async function removeMember(teamId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'teams', teamId, 'members', uid));
  batch.update(doc(db, 'teams', teamId), { memberIds: arrayRemove(uid), updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function regenerateInvite(teamId: string, oldCode: string, uid: string): Promise<string> {
  const nextCode = generateInviteCode();
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.update(doc(db, 'teams', teamId), { inviteCode: nextCode, updatedAt: serverTimestamp() });
  if (oldCode) {
    batch.update(doc(db, 'invites', oldCode), { active: false, updatedAt: serverTimestamp() });
  }
  batch.set(doc(db, 'invites', nextCode), { code: nextCode, teamId, createdBy: uid, active: true, createdAt: serverTimestamp() });
  await batch.commit();
  return nextCode;
}

