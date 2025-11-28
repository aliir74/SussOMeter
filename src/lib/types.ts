export interface ProfileData {
  username: string;
  joinDate: Date | null;
  followers: number;
  following: number;
  tweetCount: number;
  hasAvatar: boolean;
  hasBio: boolean;
  isVerified: boolean;
  scrapedAt: number;
}

export type SusRating = 'green' | 'yellow' | 'red' | 'unknown';

export interface CachedProfile extends ProfileData {
  rating: SusRating;
}
