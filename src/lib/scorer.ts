import { ProfileData, SusRating } from './types';

export function calculateSusRating(profile: ProfileData): SusRating {
  // Check for missing critical data
  if (profile.followers === -1 || profile.following === -1) {
    return 'unknown';
  }

  let redFlags = 0;

  // Account age: < 3 months = red
  if (profile.joinDate) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (profile.joinDate > threeMonthsAgo) {
      redFlags++;
    }
  }

  // Follower/Following ratio: < 0.1 = red
  if (profile.following > 0) {
    const ratio = profile.followers / profile.following;
    if (ratio < 0.1) {
      redFlags++;
    }
  }

  // Following count: > 5000 = red
  if (profile.following > 5000) {
    redFlags++;
  }

  // Tweets per day: > 50 or 0 = red
  if (profile.tweetCount === 0) {
    redFlags++;
  } else if (profile.joinDate && profile.tweetCount > 0) {
    const daysSinceJoin = Math.max(1, Math.floor(
      (Date.now() - profile.joinDate.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const tweetsPerDay = profile.tweetCount / daysSinceJoin;
    if (tweetsPerDay > 50) {
      redFlags++;
    }
  }

  // No avatar = red
  if (!profile.hasAvatar) {
    redFlags++;
  }

  // No bio = red
  if (!profile.hasBio) {
    redFlags++;
  }

  // Verified bonus: subtract 1 red flag
  if (profile.isVerified && redFlags > 0) {
    redFlags--;
  }

  // Final rating
  if (redFlags === 0) {
    return 'green';
  } else if (redFlags <= 2) {
    return 'yellow';
  } else {
    return 'red';
  }
}
