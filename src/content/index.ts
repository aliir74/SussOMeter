import { injectBadge, updateBadgeColor } from './badge';
import { scrapeHoverCard, findUsernameElements, extractUsernameFromElement } from './scraper';
import { getCachedProfile, setCachedProfile } from '../lib/cache';
import { calculateSusRating } from '../lib/scorer';

console.log('[SussOMeter] Content script loaded');

// Track which usernames we've already scraped this session
const scrapedThisSession = new Set<string>();

// Debounce helper
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
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
