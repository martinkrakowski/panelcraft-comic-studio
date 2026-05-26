'use client';

import { Card, Skeleton } from '@panelcraft/ui';

/**
 * Skeleton grid mirroring the loaded card layout so there's no layout pop
 * when projects arrive. Six placeholders is enough to fill the typical
 * dashboard viewport without scrolling on initial paint.
 */
export function DashboardLoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          className="border-slate-700/60 bg-slate-900/20 overflow-hidden"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3 mt-2" />
          </div>
        </Card>
      ))}
    </div>
  );
}
