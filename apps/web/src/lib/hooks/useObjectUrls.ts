import { useEffect, useRef, useState } from 'react';

/**
 * A semantic wrapper for managing object URLs for an array of Blobs.
 * Creates URLs on blob change and revokes them on cleanup to avoid memory leaks.
 * This satisfies the "War on useEffect" FactoryAI discipline by explicitly declaring object URL lifecycle intent.
 *
 * It uses render-phase stabilization to avoid recreating URLs when the array reference
 * changes but the content (Blob instances) remains identical.
 *
 * @param blobs The array of Blobs to create object URLs for.
 * @returns An array of object URLs matching the input blobs array.
 *
 * @example
 * const urls = useObjectUrls(blobs);
 */
export function useObjectUrls(blobs: Blob[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  const blobsRef = useRef<Blob[]>(blobs);

  // render-phase stabilization: only advance the ref when content changes
  const prev = blobsRef.current;
  if (blobs.length !== prev.length || blobs.some((b, i) => b !== prev[i])) {
    blobsRef.current = blobs;
  }
  const stableBlobs = blobsRef.current;

  useEffect(() => {
    const next = stableBlobs.map((b) => URL.createObjectURL(b));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [stableBlobs]);

  return urls;
}
