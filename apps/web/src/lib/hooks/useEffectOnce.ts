import { useEffect, useRef, EffectCallback } from 'react';

/**
 * A semantic wrapper for React's useEffect that runs exactly once, even in React 18/19 Strict Mode.
 * This satisfies the "War on useEffect" FactoryAI discipline by explicitly declaring single-execution intent.
 *
 * @param effect The effect callback to execute once.
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
    return effect();
  }, []);
}
