# SussOMeter

Chrome extension that shows colored badges next to Twitter/X usernames to indicate bot likelihood.

## Installation (Development)

1. Run `pnpm install`
2. Run `pnpm build`
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

- `pnpm dev` - Development mode with hot reload
- `pnpm build` - Production build
