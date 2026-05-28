import { useEffect, useRef, EffectCallback } from 'react';

/**
 * Semantic wrapper for React's useEffect that runs `effect` on each rising edge
 * of `active` — i.e. every time it transitions from false to true (including
 * the initial render when it starts true). It does not run while `active` is
 * false, nor re-run on repeat-true renders.
 *
 * Use for "do X once we're ready, and again if we become ready anew" — e.g.
 * fetching once a session is confirmed, where the readiness signal arrives
 * after mount and may recur after a sign-out/sign-in within the same mount.
 *
 * Like useEffectOnce, do not return a cleanup function; use useUnmountEffect or
 * standard useEffect for effects that need cleanup.
 *
 * @param active Readiness flag; the effect fires on its false→true transitions.
 * @param effect The effect callback. Do not return a cleanup function.
 *
 * @example
 * useEffectOnActivate(status === 'authenticated', () => {
 *   void fetchProjects();
 * });
 */
export function useEffectOnActivate(active: boolean, effect: EffectCallback) {
  const wasActive = useRef(false);

  useEffect(() => {
    if (active && !wasActive.current) effect();
    wasActive.current = active;
    // `effect` is intentionally excluded: the hook's contract is to fire on the
    // rising edge of `active`, not when the callback reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
