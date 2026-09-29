import * as FirebaseAuth from '@firebase/auth';
import { firebaseConfigured, getFirebaseAuth } from '@/src/services/firebase/client';

export { firebaseConfigured } from '@/src/services/firebase/client';

const { createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signOut, updateProfile } = FirebaseAuth;
type User = FirebaseAuth.User;

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!firebaseConfigured) return () => undefined;
  return getFirebaseAuth().onAuthStateChanged(callback);
}

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<User> {
  const credentials = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  await updateProfile(credentials.user, { displayName: displayName.trim() });
  return credentials.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credentials = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return credentials.user;
}

export async function signInWithGoogleAccessToken(accessToken: string): Promise<User> {
  const credentials = await signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(null, accessToken));
  return credentials.user;
}

export async function resetPasswordForEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists for this email.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Try again in a little while.',
  };
  return messages[code] ?? (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
}
