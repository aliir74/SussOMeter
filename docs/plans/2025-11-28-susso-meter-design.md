# SussOMeter - Design Document

## Overview

Chrome extension that displays inline colored badges (green/yellow/red/gray) next to Twitter/X usernames to indicate bot likelihood based on publicly visible profile signals.

**Approach:** Hover-to-reveal - badges start gray, turn colored after user hovers over profile (triggering Twitter's hover card which we scrape).

**Scope:** All tweet contexts (timeline, replies, quote tweets).

**Constraint:** DOM scraping only, no external APIs.

## Architecture

```
susso-meter/
├── src/
│   ├── content/
│   │   ├── index.ts      # Entry, MutationObserver setup
│   │   ├── scraper.ts    # Extract data from hover cards
│   │   └── badge.ts      # Inject/update badge elements
│   ├── lib/
│   │   ├── types.ts      # ProfileData, SusRating types
│   │   ├── scorer.ts     # Calculate rating from profile
│   │   └── cache.ts      # localStorage with TTL
├── manifest.json
├── vite.config.ts
└── package.json
```

**Core flow:**
1. Content script loads on twitter.com/x.com
2. MutationObserver detects tweets appearing (initial load + infinite scroll)
3. Gray badges injected next to all usernames in tweets
4. User hovers → Twitter shows hover card → we scrape profile data
5. Scorer calculates rating → badge updates to colored
6. Profile cached in localStorage (24hr TTL) → future appearances use cached rating

## Data Model

```typescript
interface ProfileData {
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

type SusRating = 'green' | 'yellow' | 'red' | 'unknown';
```

## Scoring Rules

**Red flag conditions:**

| Signal | Red flag |
|--------|----------|
| Account age | < 3 months |
| Follower/Following ratio | < 0.1 |
| Following count | > 5000 |
| Tweets per day | > 50 or exactly 0 |
| No avatar | true |
| No bio | true |

**Final rating:**
- 0 reds → Green
- 1-2 reds → Yellow
- 3+ reds → Red
- Verified → subtract 1 from red count
- Missing critical data → Unknown (gray)

**Yellow zone (warning signals, not red flags):**
- Account age 3-12 months
- Ratio 0.1-0.5
- Following 2000-5000
- Tweets/day 20-50

## DOM Interaction

**Tweet detection:**
- Selector: `article[data-testid="tweet"]`
- Username links: `a[role="link"]` with href pattern `^/[username]`

**Badge injection:**
- Element: `<span class="susso-badge">`
- Position: after username element
- Style: 8px dot, inline-block, margin-left 4px
- Colors: green=#22c55e, yellow=#eab308, red=#ef4444, gray=#9ca3af
- Identifier: `data-susso-username` attribute

**Hover card scraping:**
- Detect: `div[data-testid="HoverCard"]`
- Extract: followers, following, join date, bio, avatar, verified status

**MutationObserver:**
- Single observer on document body (childList, subtree)
- Catches new tweets and hover card appearances
- Debounced callback (100ms)

## Caching

- Key format: `susso:${username}`
- Storage: localStorage
- TTL: 24 hours
- On page load: show colored badges immediately for cached profiles

## Performance

- Debounce MutationObserver (100ms)
- Batch badge updates with requestAnimationFrame
- Skip already-badged elements
- Track scraped usernames in memory set

## Error Handling

- Selector failures → log warning, leave badge gray
- Partial data → calculate with available, mark missing as null
- localStorage quota → clear oldest entries
- All DOM operations wrapped in try/catch
