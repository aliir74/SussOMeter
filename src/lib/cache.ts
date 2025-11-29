import { ProfileData, SusRating, CachedProfile } from './types';

const CACHE_PREFIX = 'susso:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedProfile(username: string): CachedProfile | null {
  try {
    const key = CACHE_PREFIX + username.toLowerCase();
    const data = localStorage.getItem(key);
    if (!data) return null;

    const cached = JSON.parse(data) as CachedProfile;

    // Check TTL
    if (Date.now() - cached.scrapedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    // Restore Date object
    if (cached.joinDate) {
      cached.joinDate = new Date(cached.joinDate);
    }

    return cached;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile: ProfileData, rating: SusRating): void {
  try {
    const key = CACHE_PREFIX + profile.username.toLowerCase();
    const cached: CachedProfile = { ...profile, rating };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (e) {
    // localStorage quota exceeded - clear old entries
    console.warn('[SussOMeter] Cache write failed, clearing old entries');
    clearOldestCacheEntries(10);
    try {
      const key = CACHE_PREFIX + profile.username.toLowerCase();
      const cached: CachedProfile = { ...profile, rating };
      localStorage.setItem(key, JSON.stringify(cached));
    } catch {
      // Give up
    }
  }
}

function clearOldestCacheEntries(count: number): void {
  const entries: { key: string; scrapedAt: number }[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        entries.push({ key, scrapedAt: data.scrapedAt || 0 });
      } catch {
        entries.push({ key, scrapedAt: 0 });
      }
    }
  }

  entries.sort((a, b) => a.scrapedAt - b.scrapedAt);
  entries.slice(0, count).forEach(e => localStorage.removeItem(e.key));
}
