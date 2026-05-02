import React from "react";

/**
 * Tiny shimmer block. Used as a building block for tab skeletons so that
 * admin views never look "stuck" while data is in flight.
 */
export function Skeleton({
  className = "",
  rounded = "rounded-xl",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden
      className={`bg-gradient-to-r from-base-200 via-base-100 to-base-200 bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite] ${rounded} ${className}`}
    />
  );
}

/** Skeleton for the Connections list (cards). */
export function ConnectionListSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3" data-testid="connections-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10" rounded="rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2 w-1/2" />
            </div>
            <Skeleton className="w-20 h-8" rounded="rounded-xl" />
          </div>
          <Skeleton className="h-2 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for the Browse / Edit table. */
export function CrudTableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      data-testid="crud-skeleton"
    >
      <div className="bg-secondary/60 px-2 py-2 flex gap-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-base-200">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-2 py-3 flex gap-2">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the Transfer log block. */
export function TransferLogSkeleton({ lines = 8 }: { lines?: number }) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-3 space-y-2"
      data-testid="transfer-skeleton"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-2"
          rounded="rounded-md"
        />
      ))}
    </div>
  );
}

export default Skeleton;