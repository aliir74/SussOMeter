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
