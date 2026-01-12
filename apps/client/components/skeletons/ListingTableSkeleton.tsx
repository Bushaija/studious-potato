import { Skeleton } from "@/components/ui/skeleton"

interface ListingTableSkeletonProps {
  rows?: number
}

export function ListingTableSkeleton({ rows = 5 }: ListingTableSkeletonProps) {
  const skeletonRows = Array.from({ length: rows })

  return (
    <div className="space-y-2 w-full">
      {/* Search Bar */}
      <Skeleton className="h-10 max-w-sm" />

      {/* Header */}
      <Skeleton className="h-8 w-full" />

      {/* Body rows */}
      {skeletonRows.map((_, idx) => (
        <Skeleton key={idx} className="h-12 w-full" />
      ))}

      {/* Pagination */}
      <div className="flex justify-end gap-2">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-8 w-8" />
        ))}
      </div>
    </div>
  )
} 