import { Skeleton } from "@/components/ui/skeleton"

interface FormSkeletonProps {
  fields?: number
}

export function FormSkeleton({ fields = 8 }: FormSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <Skeleton className="h-4 w-32" /> {/* label */}
          <Skeleton className="h-10 w-full" /> {/* input */}
        </div>
      ))}
      {/* submit button placeholder */}
      <Skeleton className="h-10 w-32" />
    </div>
  )
} 