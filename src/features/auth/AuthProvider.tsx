import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User } from 'firebase/auth';
import { authErrorMessage, firebaseConfigured, resetPasswordForEmail, signInWithEmail, signInWithGoogleAccessToken, signOutCurrentUser, signUpWithEmail, subscribeToAuth } from './authService';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInGoogle: (accessToken: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState('');

  useEffect(() => subscribeToAuth((nextUser) => { setUser(nextUser); setLoading(false); }), []);

  async function runAuthAction(action: () => Promise<unknown>): Promise<boolean> {
    setError('');
    try {
      await action();
      return true;
    } catch (actionError) {
      setError(authErrorMessage(actionError));
      return false;
    }
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: firebaseConfigured,
    error,
    signIn: (email, password) => runAuthAction(() => signInWithEmail(email, password)),
    signInGoogle: (accessToken) => runAuthAction(() => signInWithGoogleAccessToken(accessToken)),
    signUp: (email, password, displayName) => runAuthAction(() => signUpWithEmail(email, password, displayName)),
    resetPassword: (email) => runAuthAction(() => resetPasswordForEmail(email)),
    logOut: async () => { await runAuthAction(signOutCurrentUser); },
  }), [error, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
