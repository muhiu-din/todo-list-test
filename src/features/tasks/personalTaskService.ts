import { addDoc, collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb } from '@/src/services/firebase/client';
import type { FirestoreTask } from './firestoreTypes';

export type RemoteTask = FirestoreTask & { id: string };

export async function ensurePersonalList(uid: string): Promise<string> {
  const listCollection = collection(getFirebaseDb(), 'users', uid, 'lists');
  const existing = await getDocs(query(listCollection, limit(1)));
  if (existing.docs[0]) return existing.docs[0].id;
  const listRef = doc(listCollection, 'personal');
  await setDoc(listRef, { name: 'Personal', scope: 'personal', ownerId: uid, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return listRef.id;
}

export function listenToPersonalTasks(uid: string, listId: string, callback: (tasks: RemoteTask[]) => void, onError: (error: Error) => void): Unsubscribe {
  const taskCollection = collection(getFirebaseDb(), 'users', uid, 'lists', listId, 'tasks');
  return onSnapshot(query(taskCollection, orderBy('updatedAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as RemoteTask))), onError);
}

export async function createPersonalTask(uid: string, listId: string, task: Omit<FirestoreTask, 'createdAt' | 'updatedAt'>): Promise<string> {
  const created = await addDoc(collection(getFirebaseDb(), 'users', uid, 'lists', listId, 'tasks'), { ...task, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return created.id;
}

export async function updatePersonalTask(uid: string, listId: string, taskId: string, changes: Partial<FirestoreTask>): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'users', uid, 'lists', listId, 'tasks', taskId), { ...changes, updatedAt: serverTimestamp() });
}

export async function deletePersonalTask(uid: string, listId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'users', uid, 'lists', listId, 'tasks', taskId));
}
