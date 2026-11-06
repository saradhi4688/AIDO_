import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { UnifiedAidoUser, ReviewItem } from '../types/user.types';
import { firestoreDb, storage } from './firebase.config';

function toReviewItem(id: string, data: Record<string, any>): ReviewItem {
  const createdAt = data.createdAt?.toDate
    ? data.createdAt.toDate().toISOString()
    : typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString();
  return {
    id,
    reviewerName: typeof data.reviewerName === 'string' ? data.reviewerName : 'AIDO user',
    rating: Number(data.rating),
    comment: typeof data.comment === 'string' ? data.comment : '',
    createdAt,
  };
}

function reviewSummary(items: ReviewItem[]) {
  return {
    averageRating: items.length
      ? Number((items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1))
      : 0,
    totalCount: items.length,
    items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

async function mapUser(
  id: string,
  data: Record<string, any>,
  reviews: ReviewItem[],
): Promise<UnifiedAidoUser> {
  const certificates = await Promise.all(
    (Array.isArray(data.certificates) ? data.certificates : []).map(async (certificate: Record<string, any>) => ({
      id: String(certificate.id || ''),
      title: String(certificate.title || 'Certificate'),
      fileUrl: certificate.storagePath
        ? await getDownloadURL(ref(storage, certificate.storagePath))
        : String(certificate.fileUrl || ''),
      uploadedAt: String(certificate.uploadedAt || ''),
    })),
  );
  const customerReviews = reviews.filter((review: ReviewItem & { targetRole?: string }) =>
    review.targetRole === 'customer',
  );
  const aidmateReviews = reviews.filter((review: ReviewItem & { targetRole?: string }) =>
    review.targetRole === 'aidmate',
  );

  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Unknown User',
    mobile: typeof data.mobile === 'string' ? data.mobile : '',
    email: typeof data.email === 'string' ? data.email : '',
    accountType: data.accountType,
    isActiveAidmate: data.accountType === 'provider' && data.isActiveAidmate === true,
    skills: Array.isArray(data.skills) ? data.skills : [],
    certificates,
    customerReviews: reviewSummary(customerReviews),
    aidmateReviews: reviewSummary(aidmateReviews),
    customerComplaints: [],
    aidmateComplaints: [],
    isVerified: data.isVerified === true,
    verifiedAt: data.verifiedAt?.toDate
      ? data.verifiedAt.toDate().toISOString()
      : data.verifiedAt ?? null,
  };
}

export async function fetchAllUnifiedUsers(): Promise<{
  users: UnifiedAidoUser[];
  source: 'FIREBASE';
}> {
  const [userSnapshot, reviewSnapshot] = await Promise.all([
    getDocs(collection(firestoreDb, 'users')),
    getDocs(collection(firestoreDb, 'reviews')),
  ]);
  const reviewsByUser = new Map<string, Array<ReviewItem & { targetRole?: string }>>();

  reviewSnapshot.docs.forEach(review => {
    const data = review.data();
    if (typeof data.targetUserId !== 'string') return;
    const reviews = reviewsByUser.get(data.targetUserId) ?? [];
    reviews.push({ ...toReviewItem(review.id, data), targetRole: data.targetRole });
    reviewsByUser.set(data.targetUserId, reviews);
  });

  const users = await Promise.all(userSnapshot.docs
    .filter(user => user.data().accountType !== 'admin')
    .map(user => mapUser(
      user.id,
      user.data(),
      reviewsByUser.get(user.id) ?? [],
    )));
  users.sort((a, b) => a.name.localeCompare(b.name));
  return { users, source: 'FIREBASE' };
}

export async function toggleUserAidmateStatus(
  userId: string,
  nextAidmateState: boolean,
): Promise<UnifiedAidoUser[]> {
  const userRef = doc(firestoreDb, 'users', userId);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists() || userSnapshot.data().accountType !== 'provider') {
    throw new Error('Only registered AidMate accounts can be activated.');
  }
  const batch = writeBatch(firestoreDb);
  batch.update(userRef, { isActiveAidmate: nextAidmateState });
  batch.update(doc(firestoreDb, 'publicProfiles', userId), {
    isAvailable: nextAidmateState && userSnapshot.data().isVerified === true,
  });
  await batch.commit();
  return (await fetchAllUnifiedUsers()).users;
}

export async function toggleUserVerificationBadge(
  userId: string,
  nextVerifiedState: boolean,
): Promise<UnifiedAidoUser[]> {
  const userRef = doc(firestoreDb, 'users', userId);
  const userSnapshot = await getDoc(userRef);
  if (!userSnapshot.exists()) throw new Error('User not found.');
  const batch = writeBatch(firestoreDb);
  batch.update(userRef, {
    isVerified: nextVerifiedState,
    verifiedAt: nextVerifiedState ? serverTimestamp() : null,
  });
  if (userSnapshot.data().accountType === 'provider') {
    batch.update(doc(firestoreDb, 'publicProfiles', userId), {
      isVerified: nextVerifiedState,
      isAvailable: nextVerifiedState && userSnapshot.data().isActiveAidmate === true,
    });
  }
  await batch.commit();
  return (await fetchAllUnifiedUsers()).users;
}
