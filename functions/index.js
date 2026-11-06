import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

initializeApp();

const db = getFirestore();

export const aggregateReview = onDocumentCreated(
  { document: 'reviews/{reviewId}', retry: true },
  async event => {
    const review = event.data?.data();
    if (!review) {
      logger.error('Created review event did not contain a document.', {
        reviewId: event.params.reviewId,
      });
      throw new Error('Review event is missing its document.');
    }

    const { targetUserId, targetRole, rating } = review;
    const star = String(rating);
    if (
      typeof targetUserId !== 'string' ||
      !['customer', 'aidmate'].includes(targetRole) ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      logger.error('Created review has invalid aggregate fields.', {
        reviewId: event.params.reviewId,
      });
      throw new Error('Review aggregate fields are invalid.');
    }

    const userRef = db.collection('users').doc(targetUserId);
    const processedRef = db.collection('_processedReviews').doc(event.params.reviewId);

    await db.runTransaction(async transaction => {
      const processedSnapshot = await transaction.get(processedRef);
      if (processedSnapshot.exists) return;

      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw new Error(`Review target ${targetUserId} does not exist.`);

      const user = userSnapshot.data();
      const roleMatchesAccount = (
        targetRole === 'aidmate' && user.accountType === 'provider'
      ) || (
        targetRole === 'customer' && user.accountType === 'seeker'
      );
      if (!roleMatchesAccount) {
        throw new Error(`Review target ${targetUserId} has an incompatible account type.`);
      }

      const publicProfileRef = user.accountType === 'provider'
        ? db.collection('publicProfiles').doc(targetUserId)
        : null;
      const profileSnapshot = publicProfileRef ? await transaction.get(publicProfileRef) : null;
      if (publicProfileRef && !profileSnapshot?.exists) {
        throw new Error(`Provider review target ${targetUserId} has no public profile.`);
      }

      const userRatings = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, ...user.ratings };
      const userCount = Number(user.reviewCount || 0) + 1;
      userRatings[star] = Number(userRatings[star] || 0) + 1;
      const userRatingTotal = Number(
        user.ratingTotal ?? Number(user.overallRating || 0) * Number(user.reviewCount || 0),
      ) + rating;
      transaction.update(userRef, {
        ratings: userRatings,
        reviewCount: userCount,
        ratingTotal: userRatingTotal,
        overallRating: Number((userRatingTotal / userCount).toFixed(1)),
      });

      if (publicProfileRef && profileSnapshot?.exists) {
        const profile = profileSnapshot.data();
        const profileRatings = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0, ...profile.ratings };
        const profileCount = Number(profile.reviewCount || 0) + 1;
        profileRatings[star] = Number(profileRatings[star] || 0) + 1;
        const ratingTotal = Number(
          profile.ratingTotal ?? Number(profile.overallRating || 0) * Number(profile.reviewCount || 0),
        ) + rating;
        transaction.update(publicProfileRef, {
          ratings: profileRatings,
          reviewCount: profileCount,
          ratingTotal,
          overallRating: Number((ratingTotal / profileCount).toFixed(1)),
        });
      }

      transaction.create(processedRef, {
        processedAt: FieldValue.serverTimestamp(),
      });
    });
  },
);
