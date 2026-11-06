import { FirebaseError } from 'firebase/app';
import { getIdTokenResult, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from './firebase.config';

export function getAdminAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
      return 'Firebase Authentication is not set up for this project. In Firebase Console, enable Email/Password under Authentication → Sign-in method, and confirm the admin app’s project ID matches.';
    }
    if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid') {
      return 'Firebase rejected the Web API key. Check the admin app’s VITE_FIREBASE_API_KEY and the key’s Firebase Authentication API restrictions.';
    }
    if (error.code === 'auth/too-many-requests' || error.code === 'auth/quota-exceeded') {
      return 'Firebase temporarily blocked sign-in attempts. Wait a while, then try again.';
    }
    return `Firebase Authentication error (${error.code}).`;
  }
  return error instanceof Error ? error.message : 'Admin sign-in failed.';
}

export async function isAdminUser(user: User): Promise<boolean> {
  const token = await getIdTokenResult(user);
  return token.claims.admin === true;
}

export async function loginAdmin(email: string, password: string): Promise<string> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  if (!(await isAdminUser(credential.user))) {
    await signOut(auth);
    throw new Error('This account is not authorized to use the admin panel.');
  }
  return credential.user.email || email;
}

export function getAdminSession(): string | null {
  return auth.currentUser?.email ?? null;
}

export async function clearAdminSession(): Promise<void> {
  await signOut(auth);
}
