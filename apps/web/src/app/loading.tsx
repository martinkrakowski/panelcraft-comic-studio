import { Skeleton } from "@panelcraft/ui";

/**
 * Route-level loading boundary fallback interface.
 * Renders a stylized skeletons container preview grid while dynamic router content is streaming.
 * 
 * @component
 * @returns React.Element skeletons dashboard mock layout.
 */
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-slate-800 rounded-xl p-6 bg-slate-900/40 h-64 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
