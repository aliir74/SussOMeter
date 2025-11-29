# SussOMeter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that shows colored badges next to Twitter usernames indicating bot likelihood.

**Architecture:** Content script with MutationObserver detects tweets, injects gray badges, scrapes hover cards for profile data, calculates sus rating, updates badge colors. All data cached in localStorage with 24hr TTL.

**Tech Stack:** Vite + TypeScript + CRXJS (Chrome extension plugin), no React initially.

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.json`

**Step 1: Initialize npm project**

Run:
```bash
cd /Users/aliirani/Programming/Personals/AnIdentifier/.conductor/munich
npm init -y
```

**Step 2: Install dependencies**

Run:
```bash
npm install -D vite typescript @crxjs/vite-plugin@beta @types/chrome
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
  },
});
```

**Step 5: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "SussOMeter",
  "version": "0.1.0",
  "description": "Detect sus accounts on Twitter/X",
  "permissions": ["storage"],
  "host_permissions": ["https://twitter.com/*", "https://x.com/*"],
  "content_scripts": [
    {
      "matches": ["https://twitter.com/*", "https://x.com/*"],
      "js": ["src/content/index.ts"]
    }
  ]
}
```

**Step 6: Create placeholder content script**

Create `src/content/index.ts`:
```typescript
console.log('[SussOMeter] Content script loaded');
```

**Step 7: Update package.json scripts**

Add to package.json:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

**Step 8: Build and verify**

Run:
```bash
npm run build
```
Expected: `dist/` folder created with extension files

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Vite + CRXJS project structure"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

**Step 1: Create types file**

Create `src/lib/types.ts`:
```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript interfaces for ProfileData and SusRating"
```

---

## Task 3: Scoring Engine

**Files:**
- Create: `src/lib/scorer.ts`

**Step 1: Create scorer with calculateSusRating function**

Create `src/lib/scorer.ts`:
```typescript
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
  if (profile.joinDate && profile.tweetCount >= 0) {
    const daysSinceJoin = Math.max(1, Math.floor(
      (Date.now() - profile.joinDate.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const tweetsPerDay = profile.tweetCount / daysSinceJoin;
    if (tweetsPerDay > 50 || profile.tweetCount === 0) {
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
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/scorer.ts
git commit -m "feat: implement sus rating scoring engine"
```

---

## Task 4: Cache Module

**Files:**
- Create: `src/lib/cache.ts`

**Step 1: Create cache module**

Create `src/lib/cache.ts`:
```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/cache.ts
git commit -m "feat: implement localStorage cache with 24hr TTL"
```

---

## Task 5: Badge Injection Module

**Files:**
- Create: `src/content/badge.ts`

**Step 1: Create badge module**

Create `src/content/badge.ts`:
```typescript
import { SusRating } from '../lib/types';

const BADGE_CLASS = 'susso-badge';
const BADGE_COLORS: Record<SusRating, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  unknown: '#9ca3af',
};

export function injectBadge(usernameElement: Element, username: string): HTMLSpanElement | null {
  // Check if badge already exists
  const existingBadge = usernameElement.parentElement?.querySelector(
    `.${BADGE_CLASS}[data-susso-username="${username}"]`
  );
  if (existingBadge) {
    return existingBadge as HTMLSpanElement;
  }

  const badge = document.createElement('span');
  badge.className = BADGE_CLASS;
  badge.dataset.sussoUsername = username;
  badge.style.cssText = `
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-left: 4px;
    vertical-align: middle;
    background-color: ${BADGE_COLORS.unknown};
  `;

  try {
    usernameElement.parentElement?.insertBefore(badge, usernameElement.nextSibling);
    return badge;
  } catch {
    return null;
  }
}

export function updateBadgeColor(username: string, rating: SusRating): void {
  const badges = document.querySelectorAll(
    `.${BADGE_CLASS}[data-susso-username="${username}"]`
  );
  badges.forEach(badge => {
    (badge as HTMLElement).style.backgroundColor = BADGE_COLORS[rating];
  });
}

export function getBadgeByUsername(username: string): HTMLSpanElement | null {
  return document.querySelector(
    `.${BADGE_CLASS}[data-susso-username="${username}"]`
  );
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/content/badge.ts
git commit -m "feat: implement badge injection and color update"
```

---

## Task 6: DOM Scraper Module

**Files:**
- Create: `src/content/scraper.ts`

**Step 1: Create scraper module**

Create `src/content/scraper.ts`:
```typescript
import { ProfileData } from '../lib/types';

export function scrapeHoverCard(hoverCard: Element): ProfileData | null {
  try {
    // Get username from the hover card link
    const profileLink = hoverCard.querySelector('a[role="link"][href^="/"]');
    const href = profileLink?.getAttribute('href');
    const username = href?.replace('/', '').split('/')[0];

    if (!username) return null;

    // Get text content for parsing
    const textContent = hoverCard.textContent || '';

    // Parse followers/following
    const followers = parseCount(textContent, /(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Followers/i);
    const following = parseCount(textContent, /(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Following/i);

    // Parse join date (e.g., "Joined March 2020")
    const joinDateMatch = textContent.match(/Joined\s+(\w+)\s+(\d{4})/i);
    let joinDate: Date | null = null;
    if (joinDateMatch) {
      joinDate = new Date(`${joinDateMatch[1]} 1, ${joinDateMatch[2]}`);
      if (isNaN(joinDate.getTime())) joinDate = null;
    }

    // Check for avatar (non-default)
    const avatarImg = hoverCard.querySelector('img[src*="profile_images"]');
    const hasAvatar = !!avatarImg;

    // Check for bio (description text)
    const bioElement = hoverCard.querySelector('[data-testid="UserDescription"]');
    const hasBio = !!bioElement && bioElement.textContent!.trim().length > 0;

    // Check for verified badge
    const verifiedBadge = hoverCard.querySelector('[data-testid="icon-verified"]') ||
                          hoverCard.querySelector('svg[aria-label*="Verified"]');
    const isVerified = !!verifiedBadge;

    // Tweet count is not in hover card, use -1 to indicate unknown
    const tweetCount = -1;

    return {
      username,
      joinDate,
      followers,
      following,
      tweetCount,
      hasAvatar,
      hasBio,
      isVerified,
      scrapedAt: Date.now(),
    };
  } catch (e) {
    console.warn('[SussOMeter] Failed to scrape hover card:', e);
    return null;
  }
}

function parseCount(text: string, regex: RegExp): number {
  const match = text.match(regex);
  if (!match) return -1;

  let numStr = match[1].replace(/,/g, '');
  let multiplier = 1;

  if (numStr.endsWith('K')) {
    multiplier = 1000;
    numStr = numStr.slice(0, -1);
  } else if (numStr.endsWith('M')) {
    multiplier = 1000000;
    numStr = numStr.slice(0, -1);
  } else if (numStr.endsWith('B')) {
    multiplier = 1000000000;
    numStr = numStr.slice(0, -1);
  }

  const num = parseFloat(numStr);
  return isNaN(num) ? -1 : Math.round(num * multiplier);
}

export function findUsernameElements(): Element[] {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  const usernameElements: Element[] = [];

  tweets.forEach(tweet => {
    // Find username links (format: /@username)
    const links = tweet.querySelectorAll('a[role="link"][href^="/"]');
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      // Match /@username pattern (not /username/status/... or other paths)
      if (/^\/[^/]+$/.test(href) && !href.includes('/status')) {
        // Get the span with the @username text
        const usernameSpan = link.querySelector('span');
        if (usernameSpan?.textContent?.startsWith('@')) {
          usernameElements.push(usernameSpan);
        }
      }
    });
  });

  return usernameElements;
}

export function extractUsernameFromElement(element: Element): string | null {
  const text = element.textContent?.trim();
  if (text?.startsWith('@')) {
    return text.slice(1);
  }
  return null;
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors

**Step 3: Commit**

```bash
git add src/content/scraper.ts
git commit -m "feat: implement hover card scraper and username finder"
```

---

## Task 7: Main Content Script

**Files:**
- Modify: `src/content/index.ts`

**Step 1: Implement main content script**

Replace `src/content/index.ts`:
```typescript
import { injectBadge, updateBadgeColor } from './badge';
import { scrapeHoverCard, findUsernameElements, extractUsernameFromElement } from './scraper';
import { getCachedProfile, setCachedProfile } from '../lib/cache';
import { calculateSusRating } from '../lib/scorer';

console.log('[SussOMeter] Content script loaded');

// Track which usernames we've already scraped this session
const scrapedThisSession = new Set<string>();

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Process all visible username elements
function processUsernames(): void {
  const usernameElements = findUsernameElements();

  usernameElements.forEach(element => {
    const username = extractUsernameFromElement(element);
    if (!username) return;

    // Inject badge (returns existing if already present)
    const badge = injectBadge(element, username);
    if (!badge) return;

    // Check cache for existing rating
    const cached = getCachedProfile(username);
    if (cached) {
      updateBadgeColor(username, cached.rating);
    }
  });
}

// Handle hover card appearing
function handleHoverCard(hoverCard: Element): void {
  const profile = scrapeHoverCard(hoverCard);
  if (!profile) return;

  // Skip if already scraped this session
  if (scrapedThisSession.has(profile.username.toLowerCase())) return;
  scrapedThisSession.add(profile.username.toLowerCase());

  // Calculate rating
  const rating = calculateSusRating(profile);

  // Cache it
  setCachedProfile(profile, rating);

  // Update all badges for this username
  updateBadgeColor(profile.username, rating);

  console.log(`[SussOMeter] ${profile.username}: ${rating}`, profile);
}

// Set up MutationObserver
const observer = new MutationObserver(
  debounce((mutations: MutationRecord[]) => {
    // Process new tweets
    processUsernames();

    // Check for hover card
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) {
          const hoverCard = node.querySelector('[data-testid="HoverCard"]') ||
                           (node.matches('[data-testid="HoverCard"]') ? node : null);
          if (hoverCard) {
            // Small delay to let hover card fully render
            setTimeout(() => handleHoverCard(hoverCard), 100);
          }
        }
      });
    });
  }, 100)
);

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial processing
setTimeout(processUsernames, 500);
```

**Step 2: Build extension**

Run:
```bash
npm run build
```
Expected: Build succeeds, `dist/` folder updated

**Step 3: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: implement main content script with MutationObserver"
```

---

## Task 8: Extension Icons

**Files:**
- Create: `public/icons/icon16.png`
- Create: `public/icons/icon48.png`
- Create: `public/icons/icon128.png`
- Modify: `manifest.json`

**Step 1: Create icon directory**

Run:
```bash
mkdir -p public/icons
```

**Step 2: Create simple SVG icon and convert to PNGs**

Create `public/icons/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="56" fill="#ef4444" stroke="#991b1b" stroke-width="8"/>
  <text x="64" y="80" text-anchor="middle" font-family="Arial Black" font-size="48" fill="white">?</text>
</svg>
```

Note: For production, convert SVG to PNG at 16x16, 48x48, 128x128. For now, we'll use the SVG approach with a placeholder.

**Step 3: Update manifest.json to add icons**

Add to `manifest.json` after description:
```json
{
  "icons": {
    "16": "public/icons/icon.svg",
    "48": "public/icons/icon.svg",
    "128": "public/icons/icon.svg"
  }
}
```

**Step 4: Commit**

```bash
git add public/icons manifest.json
git commit -m "feat: add extension icon"
```

---

## Task 9: Final Build and Testing Instructions

**Step 1: Final build**

Run:
```bash
npm run build
```

**Step 2: Create README with testing instructions**

Create `README.md` (replace existing):
```markdown
# SussOMeter

Chrome extension that shows colored badges next to Twitter/X usernames to indicate bot likelihood.

## Installation (Development)

1. Run `npm install`
2. Run `npm run build`
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the `dist/` folder

## Usage

1. Go to twitter.com or x.com
2. Gray badges appear next to usernames
3. Hover over a username to trigger Twitter's hover card
4. Badge turns colored based on sus rating:
   - Green = Looks legit
   - Yellow = Some red flags (1-2)
   - Red = Suspicious (3+ red flags)
   - Gray = Not yet analyzed

## Scoring Factors

- Account age (< 3 months = red flag)
- Follower/following ratio (< 0.1 = red flag)
- Following count (> 5000 = red flag)
- No profile picture = red flag
- No bio = red flag
- Verified accounts get -1 red flag bonus

## Development

- `npm run dev` - Development mode with hot reload
- `npm run build` - Production build
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation and usage instructions"
```

---

## Summary

After completing all tasks, you will have:

1. **Working Chrome extension** that loads on twitter.com/x.com
2. **Gray badges** injected next to all usernames in tweets
3. **Hover-to-reveal** functionality that scrapes profile data
4. **Scoring engine** that calculates sus rating
5. **Colored badges** (green/yellow/red) based on score
6. **24-hour cache** in localStorage
7. **README** with installation instructions

To test: Load unpacked extension from `dist/` folder, visit twitter.com, and hover over usernames.
