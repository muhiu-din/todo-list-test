import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb } from '@/src/services/firebase/client';
import type { ListScope, TaskList } from './types';

export function listenToLists(path: string, callback: (lists: TaskList[]) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(getFirebaseDb(), path), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as TaskList))), onError);
}

export async function createList(path: string, name: string, createdBy: string, scope: ListScope, teamId?: string): Promise<string> {
  const data = { name: name.trim(), createdBy, scope, ...(teamId ? { teamId } : {}), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const created = await addDoc(collection(getFirebaseDb(), path), data);
  return created.id;
}

export async function renameList(path: string, listId: string, name: string): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), path, listId), { name: name.trim(), updatedAt: serverTimestamp() });
}

export async function deleteList(path: string, listId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), path, listId));
}
