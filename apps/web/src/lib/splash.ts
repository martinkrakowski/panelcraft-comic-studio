/**
 * Tracks whether the dashboard "what would you like to do" chooser has already
 * surfaced in the current browser session.
 *
 * Backed by `sessionStorage` so it survives reloads — unlike a module-level
 * flag, which resets on every fresh JS context and so re-prompts on each
 * reload — but resets when the tab/session ends. Net effect: once per session.
 *
 * The login chooser marks it seen so that landing on the dashboard right after
 * authentication doesn't immediately re-prompt with the splash (the user
 * already made their choice on the login screen).
 */
const SPLASH_SEEN_KEY = 'varo:splashSeen';

/** True when the chooser has already been shown (or pre-empted) this session. */
export function hasSeenSplash(): boolean {
  try {
    return window.sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
  } catch {
    // sessionStorage unavailable (private mode, etc.) — treat as unseen.
    return false;
  }
}

/** Record that the chooser has been surfaced (or pre-empted) for this session. */
export function markSplashSeen(): void {
  try {
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
  } catch {
    // sessionStorage unavailable — the splash may re-show; acceptable.
  }
}
