"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Lazy load the heavy details view
const ExecutionDetailsView = dynamic(
  () => import("@/app/dashboard/execution/details/_components/execution-details-view").then((mod) => ({ default: mod.ExecutionDetailsView })),
  {
    loading: () => (
      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    ),
  }
);

export default function ExecutionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id as string;
  const executionId = Number(idParam);

  const handleBack = useCallback(() => {
    router.push("/dashboard/execution");
  }, [router]);

  const handleEdit = useCallback(() => {
    router.push(`/dashboard/execution/edit/${executionId}`);
  }, [router, executionId]);

  if (!executionId || Number.isNaN(executionId)) {
    router.push("/dashboard/execution");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <ExecutionDetailsView 
          executionId={executionId}
          onBack={handleBack}
          onEdit={handleEdit}
        /> 
      </div>
    </div>
  );
}



