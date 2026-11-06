import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, StorageReference, uploadBytes } from 'firebase/storage';
import { getFirebaseAuth, getFirebaseStorage, getFirestoreDb } from '../firebase';
import { AidmateProfile, Deal, Message, UserRole } from '../types';

function mapDeal(id: string, data: Record<string, any>): Deal {
  return {
    ...data,
    id,
    time: data.createdAt?.toDate
      ? data.createdAt.toDate().toLocaleString()
      : data.time || 'Just now',
  } as Deal;
}

function sortDeals(deals: Deal[]): Deal[] {
  return deals.sort((a, b) => {
    const timeA = (a as Deal & { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() ?? 0;
    const timeB = (b as Deal & { createdAt?: { toMillis?: () => number } }).createdAt?.toMillis?.() ?? 0;
    return timeB - timeA;
  });
}

export function subscribeToDeals(
  uid: string,
  role: UserRole,
  onDeals: (deals: Deal[]) => void,
  onError: (error: Error) => void,
): () => void {
  const db = getFirestoreDb();
  const dealsRef = collection(db, 'deals');
  const snapshots = new Map<string, Deal>();
  const emit = () => onDeals(sortDeals(Array.from(snapshots.values())));
  const queries = role === 'provider'
    ? [
        query(dealsRef, where('status', '==', 'pending')),
        query(dealsRef, where('providerUid', '==', uid)),
      ]
    : [query(dealsRef, where('seekerUid', '==', uid))];

  const unsubscribers = queries.map(dealQuery => onSnapshot(
    dealQuery,
    snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') snapshots.delete(change.doc.id);
        else snapshots.set(change.doc.id, mapDeal(change.doc.id, change.doc.data()));
      });
      emit();
    },
    error => onError(error),
  ));

  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export async function createDeal(input: Omit<Deal, 'id' | 'status' | 'seekerUid'>): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in before creating a request.');
  const { imageUrl, ...dealData } = input;
  const result = await addDoc(collection(getFirestoreDb(), 'deals'), {
    ...Object.fromEntries(Object.entries(dealData).filter(([, value]) => value !== undefined)),
    seekerUid: user.uid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  if (imageUrl) {
    if (!imageUrl.startsWith('data:image/')) {
      await deleteDoc(result);
      throw new Error('The request photo format is not supported.');
    }
    let imageRef: StorageReference | undefined;
    let uploaded = false;
    try {
      const response = await fetch(imageUrl);
      const image = await response.blob();
      if (
        image.size > 5 * 1024 * 1024 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)
      ) {
        throw new Error('Request photos must be JPEG, PNG, or WebP images no larger than 5 MB.');
      }
      imageRef = ref(getFirebaseStorage(), `deals/${result.id}/request/${user.uid}_${Date.now()}`);
      await uploadBytes(imageRef, image, { contentType: image.type });
      uploaded = true;
      await updateDoc(result, { imageUrl: await getDownloadURL(imageRef) });
    } catch (error) {
      try {
        if (uploaded && imageRef) await deleteObject(imageRef);
        await deleteDoc(result);
      } catch (cleanupError) {
        throw new Error(
          `Request creation failed and the incomplete request could not be removed. ${cleanupError instanceof Error ? cleanupError.message : ''}`,
        );
      }
      throw error;
    }
  }
  return result.id;
}

export async function acceptDeal(dealId: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before accepting a request.');
  const db = getFirestoreDb();
  const [dealSnapshot, userSnapshot] = await Promise.all([
    getDoc(doc(db, 'deals', dealId)),
    getDoc(doc(db, 'users', user.uid)),
  ]);
  if (!userSnapshot.exists() || userSnapshot.data().accountType !== 'provider') {
    throw new Error('Only AidMate accounts can accept requests.');
  }
  if (!dealSnapshot.exists()) throw new Error('This request is no longer available.');
  const profile = userSnapshot.data();

  await runTransaction(db, async transaction => {
    const currentDeal = await transaction.get(doc(db, 'deals', dealId));
    if (!currentDeal.exists() || currentDeal.data().status !== 'pending') {
      throw new Error('This request has already been accepted or closed.');
    }
    transaction.update(currentDeal.ref, {
      status: 'accepted',
      providerUid: user.uid,
      providerName: profile.name,
      providerMobile: profile.mobile,
      providerLocation: profile.location || null,
      acceptedAt: serverTimestamp(),
    });
  });
}

export async function completeDeal(dealId: string): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), 'deals', dealId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

export function subscribeToAidmates(
  onProfiles: (profiles: AidmateProfile[]) => void,
  onError: (error: Error) => void,
): () => void {
  const profilesQuery = query(collection(getFirestoreDb(), 'publicProfiles'), where('isVerified', '==', true));
  return onSnapshot(
    profilesQuery,
    snapshot => onProfiles(snapshot.docs.map(profile => ({
      ...profile.data(),
      id: profile.id,
    }) as AidmateProfile)),
    onError,
  );
}

export function subscribeToAidmateProfile(
  uid: string,
  onProfile: (profile: AidmateProfile) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(getFirestoreDb(), 'publicProfiles', uid),
    snapshot => {
      if (!snapshot.exists()) {
        onError(new Error('Your AidMate profile could not be found.'));
        return;
      }
      onProfile({ ...snapshot.data(), id: snapshot.id } as AidmateProfile);
    },
    onError,
  );
}

export async function updateAidmateAvailability(uid: string, isAvailable: boolean): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), 'publicProfiles', uid), { isAvailable });
}

export async function updateAidmateProfile(
  profile: AidmateProfile,
  photoFile?: File | null,
): Promise<AidmateProfile> {
  const uid = profile.id;
  let profilePictureUrl = profile.profilePictureUrl;
  if (photoFile) {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type) ||
      photoFile.size > 5 * 1024 * 1024
    ) {
      throw new Error('Profile photos must be JPEG, PNG, or WebP images no larger than 5 MB.');
    }
    const photoRef = ref(
      getFirebaseStorage(),
      `users/${uid}/profile/${Date.now()}_${photoFile.name.replace(/[^\w.-]/g, '_')}`,
    );
    await uploadBytes(photoRef, photoFile, { contentType: photoFile.type });
    profilePictureUrl = await getDownloadURL(photoRef);
  }
  const publicFields = {
    name: profile.name,
    mobile: profile.mobile,
    profilePictureUrl,
    district: profile.district,
    state: profile.state,
    services: profile.services,
    skills: profile.skills,
    isAvailable: profile.isAvailable,
    location: profile.location,
    distance: profile.distance,
    bio: profile.bio,
  };
  const batch = writeBatch(getFirestoreDb());
  batch.update(doc(getFirestoreDb(), 'users', uid), {
    skills: profile.skills,
    bio: profile.bio,
    location: profile.location,
    profilePictureUrl,
  });
  batch.update(doc(getFirestoreDb(), 'publicProfiles', uid), publicFields);
  await batch.commit();
  return { ...profile, profilePictureUrl };
}

export async function sendMessage(
  dealId: string | number,
  message: { text: string; senderId: 'provider' | 'seeker'; mediaUrl?: string },
): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in before sending a message.');
  await addDoc(collection(getFirestoreDb(), 'deals', String(dealId), 'messages'), {
    ...message,
    senderUid: user.uid,
    timestamp: serverTimestamp(),
  });
}

export async function uploadChatMedia(dealId: string | number, file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPEG, PNG, or WebP image attachments are supported.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Sign in before uploading an image.');
  const storageRef = ref(
    getFirebaseStorage(),
    `deals/${String(dealId)}/messages/${user.uid}_${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`,
  );
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export function onNewMessage(
  dealId: string | number,
  callback: (message: Message) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = query(
    collection(getFirestoreDb(), 'deals', String(dealId), 'messages'),
    orderBy('timestamp', 'asc'),
  );
  return onSnapshot(
    messagesQuery,
    snapshot => snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        callback({
          id: change.doc.id,
          text: data.text || '',
          senderId: data.senderId,
          mediaUrl: data.mediaUrl,
          timestamp: data.timestamp?.toMillis?.() ?? Date.now(),
        });
      }
    }),
    onError,
  );
}
