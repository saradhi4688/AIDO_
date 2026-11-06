import 'dotenv/config';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!projectId || !email || !password || password.length < 12) {
  throw new Error(
    'Set FIREBASE_PROJECT_ID, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters.',
  );
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service-account file path.');
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const auth = getAuth();
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (error.code !== 'auth/user-not-found') throw error;
  user = await auth.createUser({
    email,
    password,
    displayName: 'AIDO Administrator',
    emailVerified: true,
  });
}
if (!user.emailVerified) {
  user = await auth.updateUser(user.uid, { emailVerified: true });
}

await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
await getFirestore().collection('users').doc(user.uid).set({
  name: user.displayName || 'AIDO Administrator',
  email,
  mobile: '',
  accountType: 'admin',
  isActiveAidmate: true,  // Updated to true
  isVerified: true,       // Updated to true
  skills: [],
  certificates: [],
  overallRating: 0,
  reviewCount: 0,
  ratings: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
  createdAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log(`Admin access provisioned for ${email} (${user.uid}).`);