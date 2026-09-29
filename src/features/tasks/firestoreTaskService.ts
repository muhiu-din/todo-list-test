import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb } from '@/src/services/firebase/client';
import type { FirestoreTask } from './firestoreTypes';

export function listenToTasks(path: string, callback: (tasks: Array<FirestoreTask & { id: string }>) => void, onError: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(getFirebaseDb(), path), orderBy('updatedAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as FirestoreTask & { id: string }))), onError);
}

export async function createTask(path: string, task: Omit<FirestoreTask, 'createdAt' | 'updatedAt'>): Promise<string> {
  const created = await addDoc(collection(getFirebaseDb(), path), { ...task, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return created.id;
}

export async function updateTask(path: string, taskId: string, changes: Partial<FirestoreTask>): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), path, taskId), { ...changes, updatedAt: serverTimestamp() });
}

export async function deleteTask(path: string, taskId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), path, taskId));
}
