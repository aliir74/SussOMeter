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
