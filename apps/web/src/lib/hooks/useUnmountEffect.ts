import { useEffect, useRef } from 'react';

/**
 * A semantic wrapper for React's useEffect that runs only when the component unmounts.
 * Uses a cleanup ref to ensure we do not execute stale closures during unmount.
 * This satisfies the "War on useEffect" FactoryAI discipline by explicitly declaring unmount cleanup intent.
 *
 * @param cleanup The cleanup function to execute on unmount.
 *
 * @example
 * useUnmountEffect(() => {
 *   cleanupExternalResource();
 * });
 */
export function useUnmountEffect(cleanup: () => void) {
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  useEffect(() => {
    return () => cleanupRef.current();
  }, []);
}
