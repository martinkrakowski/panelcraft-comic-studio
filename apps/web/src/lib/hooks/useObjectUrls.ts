import { useEffect, useRef, useState } from 'react';

/**
 * A semantic wrapper for managing object URLs for an array of Blobs.
 * Creates URLs on blob change and revokes them on cleanup to avoid memory leaks.
 * This satisfies the "War on useEffect" FactoryAI discipline by explicitly declaring object URL lifecycle intent.
 *
 * @param blobs The array of Blobs to create object URLs for.
 * @returns An array of object URLs matching the input blobs array.
 *
 * @example
 * const urls = useObjectUrls(blobs);
 */
export function useObjectUrls(blobs: Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  const prevBlobsRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Shallow comparison of array contents to prevent infinite rendering loops
    const hasChanged =
      blobs.length !== prevBlobsRef.current.length ||
      blobs.some((b, i) => b !== prevBlobsRef.current[i]);

    if (!hasChanged) return;
    prevBlobsRef.current = blobs;

    const next = blobs.map((b) => URL.createObjectURL(b));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [blobs]);

  return urls;
}
