import { useEffect, useRef } from 'react';

/**
 * A semantic wrapper for polling an async or sync callback at a fixed interval.
 * Uses a callback ref to avoid interval restarts when the consumer's state changes.
 * This satisfies the "War on useEffect" FactoryAI discipline by explicitly declaring polling intent.
 *
 * @param callback The callback to execute on each interval.
 * @param opts.enabled Whether polling is active.
 * @param opts.intervalMs The interval duration in milliseconds.
 *
 * @example
 * usePolling(checkStatus, { enabled: isProcessing, intervalMs: 2000 });
 */
export function usePolling(
  callback: () => void | Promise<void>,
  { enabled, intervalMs }: { enabled: boolean; intervalMs: number }
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      callbackRef.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
