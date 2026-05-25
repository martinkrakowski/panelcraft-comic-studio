'use client';

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className,
}: ImageWithFallbackProps) {
  const [error, setError] = React.useState(false);

  if (error || !src) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-500 text-sm space-y-2 w-full h-full bg-slate-950">
        <ImageIcon className="h-8 w-8 text-slate-700 animate-pulse" />
        <span className="text-xs text-slate-500">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}
