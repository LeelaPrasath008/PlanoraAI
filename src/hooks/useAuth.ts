import { useState, useEffect, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { bootstrapUserProfile } from '../services/firestoreService';
import { logClientWarning } from '../utils/clientLogger';

/**
 * Custom hook managing Firebase Google Authentication state and profile bootstrapping.
 * @param notify Callback to surface status/warning messages to the user.
 */
export function useAuth(
  notify: (message: string, tone?: 'info' | 'warning') => void
) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      if (user) {
        try {
          await bootstrapUserProfile({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          });
        } catch (error) {
          logClientWarning({
            context: 'useAuth bootstrapUserProfile failed',
            error,
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      notify('Signed in with Google. Cloud sync enabled.');
    } catch (error) {
      logClientWarning({ context: 'useAuth signInWithPopup failed', error });
      notify(
        'Sign-in was cancelled or blocked by popup settings. Continuing in local demo mode.',
        'warning'
      );
    }
  }, [notify]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      notify('Signed out. Switched to local workspace.');
    } catch (error) {
      logClientWarning({ context: 'useAuth signOut failed', error });
      notify('Error signing out.', 'warning');
    }
  }, [notify]);

  return {
    currentUser,
    isAuthReady,
    handleSignIn,
    handleSignOut,
  };
}
