import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import {
  collection,
  DocumentData,
  DocumentSnapshot,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref, StorageReference, uploadBytes } from 'firebase/storage';
import { getFirebaseAuth, getFirebaseStorage, getFirestoreDb } from '../firebase';
import { UserData, UserRole } from '../types';

export interface AuthAccount extends UserData {
  id: string;
  email: string;
  accountType: 'seeker' | 'provider';
}

function toAuthAccount(
  uid: string,
  email: string,
  profile: Record<string, unknown>,
  isAvailable = false,
): AuthAccount {
  if (profile.accountType !== 'seeker' && profile.accountType !== 'provider') {
    throw new Error('This account has no valid AIDO profile. Contact support.');
  }
  if (typeof profile.name !== 'string' || typeof profile.mobile !== 'string') {
    throw new Error('This account profile is incomplete. Contact support.');
  }
  return {
    id: uid,
    email,
    name: profile.name,
    mobile: profile.mobile,
    isActiveAidmate: profile.isActiveAidmate === true,
    isAvailable,
    overallRating: typeof profile.overallRating === 'number' ? profile.overallRating : undefined,
    reviewCount: typeof profile.reviewCount === 'number' ? profile.reviewCount : undefined,
    ratings: profile.ratings as UserData['ratings'],
    accountType: profile.accountType,
  };
}

export function getUserRole(account: AuthAccount): UserRole {
  return account.accountType === 'provider' ? 'provider' : 'seeker';
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/configuration-not-found':
        return 'Firebase Authentication is not set up for this project. In Firebase Console, open Authentication, select Get started, then enable Email/Password under Sign-in method. Make sure the app’s Firebase project ID matches that project.';
      case 'auth/operation-not-allowed':
        return 'Email/Password sign-in is disabled for this Firebase project. Enable it in Firebase Console under Authentication → Sign-in method.';
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid':
        return 'Firebase rejected the Web API key. Check that VITE_FIREBASE_API_KEY belongs to this project and that its API restrictions allow Firebase Authentication.';
      case 'auth/unauthorized-continue-uri':
      case 'auth/invalid-continue-uri':
        return 'Firebase rejected the verification link domain. Add this site’s domain in Firebase Console under Authentication → Settings → Authorized domains.';
      case 'auth/quota-exceeded':
        return 'Firebase has temporarily reached its email sending limit. Wait before requesting another verification email.';
      case 'auth/too-many-requests':
        return 'Firebase temporarily blocked this request due to too many attempts. Wait a while, then try again.';
      case 'auth/network-request-failed':
        return 'Could not reach Firebase Authentication. Check your internet connection and try again.';
      default:
        return `Firebase Authentication error (${error.code}).`;
    }
  }
  return error instanceof Error ? error.message : 'Unable to authenticate. Please try again.';
}

export async function registerAccount(input: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  accountType: 'seeker' | 'provider';
  skills?: string[];
  certificateFile?: File | null;
  certificateName?: string;
  experienceYears?: number;
}): Promise<AuthAccount> {
  if (input.certificateFile && (
    input.certificateFile.size > 10 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(input.certificateFile.type)
  )) {
    throw new Error('Certificates must be JPEG, PNG, WebP, or PDF files no larger than 10 MB.');
  }
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const credential = await createUserWithEmailAndPassword(
    auth,
    input.email.trim().toLowerCase(),
    input.password,
  );
  const uid = credential.user.uid;
  const userRef = doc(db, 'users', uid);
  const skills = input.skills ?? [];
  const ratings = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  let certificateStorageRef: StorageReference | undefined;

  try {
    if (input.certificateFile) {
      certificateStorageRef = ref(
        getFirebaseStorage(),
        `users/${uid}/certificates/${Date.now()}_${input.certificateFile.name.replace(/[^\w.-]/g, '_')}`,
      );
      await uploadBytes(certificateStorageRef, input.certificateFile, {
        contentType: input.certificateFile.type,
      });
    }

    const batch = writeBatch(db);
    batch.set(userRef, {
      name: input.name.trim(),
      email: credential.user.email,
      mobile: input.mobile,
      accountType: input.accountType,
      isActiveAidmate: false,
      isVerified: false,
      skills,
      certificates: certificateStorageRef
        ? [{
            id: certificateStorageRef.name,
            title: input.certificateName || input.certificateFile?.name || 'Certificate',
            storagePath: certificateStorageRef.fullPath,
            uploadedAt: new Date().toISOString(),
          }]
        : [],
      experienceYears: input.experienceYears ?? null,
      overallRating: 0,
      reviewCount: 0,
      ratingTotal: 0,
      ratings,
      createdAt: serverTimestamp(),
    });

    if (input.accountType === 'provider') {
      batch.set(doc(db, 'publicProfiles', uid), {
        name: input.name.trim(),
        mobile: input.mobile,
        profilePictureUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(input.name)}`,
        district: 'Local',
        state: 'India',
        overallRating: 0,
        reviewCount: 0,
        ratingTotal: 0,
        services: skills,
        skills,
        jobs: [],
        ratings,
        isAvailable: false,
        isVerified: false,
        location: { lat: 17.6868, lng: 83.2185 },
        distance: '0 km',
        bio: '',
      });
    }

    await batch.commit();
  } catch (error) {
    try {
      if (certificateStorageRef) await deleteObject(certificateStorageRef);
      await deleteUser(credential.user);
    } catch (cleanupError) {
      throw new Error(
        `Account setup failed and Firebase could not remove the incomplete account. ${cleanupError instanceof Error ? cleanupError.message : ''}`,
      );
    }
    throw error;
  }

  try {
    await sendEmailVerification(credential.user);
  } catch (error) {
    await signOut(auth);
    throw new Error(
      `Your account was created, but Firebase could not send the verification email. The account is still registered; choose Login and try again later to resend it. ${getAuthErrorMessage(error)}`,
    );
  }
  await signOut(auth);

  return toAuthAccount(uid, credential.user.email || input.email, {
    name: input.name.trim(),
    mobile: input.mobile,
    accountType: input.accountType,
    overallRating: 0,
    reviewCount: 0,
    ratings,
  });
}

export async function loginAccount(input: {
  email: string;
  password: string;
  accountType: 'seeker' | 'provider';
}): Promise<AuthAccount> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(
    auth,
    input.email.trim().toLowerCase(),
    input.password,
  );
  if (!credential.user.emailVerified) {
    try {
      await sendEmailVerification(credential.user);
    } finally {
      await signOut(auth);
    }
    throw new Error('Verify your email using the link we just sent, then sign in again.');
  }
  const db = getFirestoreDb();
  const profileSnapshot = await getDoc(doc(db, 'users', credential.user.uid));
  if (!profileSnapshot.exists()) {
    await signOut(auth);
    throw new Error('Your Firebase account does not have an AIDO profile. Contact support.');
  }

  const account = toAuthAccount(
    credential.user.uid,
    credential.user.email || input.email,
    profileSnapshot.data(),
    accountAvailability(profileSnapshot.data().accountType, await getDoc(doc(db, 'publicProfiles', credential.user.uid))),
  );
  if (account.accountType !== input.accountType) {
    await signOut(auth);
    throw new Error(`This email is registered as an ${account.accountType} account.`);
  }
  return account;
}

export async function restoreAuthSession(): Promise<AuthAccount | null> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user?.email) return null;
  if (!user.emailVerified) {
    await signOut(auth);
    return null;
  }

  const profileSnapshot = await getDoc(doc(getFirestoreDb(), 'users', user.uid));
  if (!profileSnapshot.exists()) {
    await signOut(auth);
    return null;
  }
  const publicProfile = profileSnapshot.data().accountType === 'provider'
    ? await getDoc(doc(getFirestoreDb(), 'publicProfiles', user.uid))
    : null;
  return toAuthAccount(
    user.uid,
    user.email,
    profileSnapshot.data(),
    publicProfile?.exists() ? publicProfile.data().isAvailable === true : false,
  );
}

function accountAvailability(
  accountType: unknown,
  publicProfile: DocumentSnapshot<DocumentData>,
): boolean {
  return accountType === 'provider' && publicProfile.exists()
    ? publicProfile.data().isAvailable === true
    : false;
}

export async function clearAuthSession(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim()) throw new Error('Enter your account email first.');
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

export async function submitReview(input: {
  jobId: string;
  targetUserId?: string;
  targetName: string;
  targetMobile?: string;
  reviewerName: string;
  targetRole: 'customer' | 'aidmate';
  rating: number;
  comment: string;
}): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in before submitting a review.');
  if (!input.targetUserId) throw new Error('The review recipient could not be matched to an account.');
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(input.jobId)) {
    throw new Error('This job cannot accept a review because its ID is invalid.');
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('Rating must be between 1 and 5.');
  }
  if (input.comment.length > 2000) throw new Error('Feedback must be 2000 characters or fewer.');

  const reviewId = `${user.uid}_${input.jobId}_${input.targetRole}`;
  await setDoc(doc(collection(getFirestoreDb(), 'reviews'), reviewId), {
    reviewerId: user.uid,
    reviewerName: input.reviewerName,
    jobId: input.jobId,
    targetUserId: input.targetUserId ?? null,
    targetName: input.targetName,
    targetMobile: input.targetMobile ?? null,
    targetRole: input.targetRole,
    rating: input.rating,
    comment: input.comment.trim(),
    createdAt: serverTimestamp(),
  });
}
