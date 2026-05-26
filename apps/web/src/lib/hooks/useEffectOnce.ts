import { useEffect, useRef, EffectCallback } from 'react';

/**
 * A semantic wrapper for React's useEffect that runs exactly once, even in React 18/19 Strict Mode.
 * This satisfies the "War on useEffect" FactoryAI discipline by explicitly declaring single-execution intent.
 *
 * WARNING: Do not return a cleanup function from this hook. In Strict Mode, the cleanup function will
 * be executed during the simulated unmount but the effect will not run again on the remount, leading
 * to leaked resources or broken cleanups. For effects with cleanup, use standard useEffect or useUnmountEffect.
 *
 * If a cleanup function is returned, a console.error will be emitted in development to alert the developer.
 *
 * @param effect The effect callback to execute once. Do not return a cleanup function.
 *
 * @example
 * useEffectOnce(() => {
 *   logTelemetry();
 * });
 */
export function useEffectOnce(effect: EffectCallback) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const cleanup = effect();
    if (cleanup && typeof cleanup === 'function') {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          'useEffectOnce: Effect callback returned a cleanup function. ' +
            'useEffectOnce does not support cleanup functions because they leak resources on unmount in Strict Mode. ' +
            'Use standard useEffect or useUnmountEffect instead.'
        );
      }
    }
    return cleanup;
    // `effect` is intentionally excluded: this hook's contract is single
    // execution against the first effect identity, regardless of later
    // re-renders changing the callback reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
