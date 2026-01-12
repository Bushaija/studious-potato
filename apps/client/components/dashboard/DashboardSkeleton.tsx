import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-full sm:w-[200px]" />
        <Skeleton className="h-9 w-full sm:w-[200px]" />
        <Skeleton className="h-9 w-full sm:w-[150px]" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <Skeleton className="h-[300px] w-[300px] rounded-full" />
          </CardContent>
        </Card>

        {/* Bar Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton
                    className="w-full"
                    style={{ height: `${Math.random() * 100 + 50}px` }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Table Header */}
            <div className="flex gap-4 pb-2 border-b">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Table Rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MetricsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

export function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table Header */}
          <div className="flex gap-4 pb-2 border-b">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {/* Table Rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 py-2">
              {[...Array(6)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-20" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
