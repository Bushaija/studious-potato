import { Skeleton } from "@/components/ui/skeleton"

interface ReportSkeletonProps {
  sections?: number
}

export function ReportSkeleton({ sections = 3 }: ReportSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Report title */}
      <Skeleton className="h-6 w-48" />

      {Array.from({ length: sections }).map((_, idx) => (
        <div key={idx} className="space-y-4">
          {/* Section heading */}
          <Skeleton className="h-5 w-40" />
          {/* Section table */}
          <Skeleton className="h-40 w-full" />
        </div>
      ))}
    </div>
  )
} 