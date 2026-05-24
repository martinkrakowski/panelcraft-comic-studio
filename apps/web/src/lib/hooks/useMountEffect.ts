import { useEffect, EffectCallback } from "react";

/**
 * A semantic wrapper for React's useEffect that runs exactly once when the component mounts.
 * This satisfies the "War on useEffect" FactoryAI discipline by explicitly declaring mounting intent.
 * 
 * @param effect The effect callback to execute.
 * 
 * @example
 * useMountEffect(() => {
 *   fetchData();
 * });
 */
export function useMountEffect(effect: EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
