"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGetExecutionDocuments } from "@/hooks/queries/documents";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentCountBadgeProps {
  executionEntryId: number;
  onClick?: () => void;
}

export function DocumentCountBadge({
  executionEntryId,
  onClick,
}: DocumentCountBadgeProps) {
  const { data, isLoading } = useGetExecutionDocuments({
    executionEntryId,
  });

  if (isLoading) {
    return <Skeleton className="h-5 w-16" />;
  }

  const count = data?.documents?.length || 0;

  // Determine badge variant based on count
  const getVariant = () => {
    if (count === 0) return "outline";
    if (count <= 3) return "secondary";
    return "default";
  };

  return (
    <Badge
      variant={getVariant()}
      className="gap-1 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={onClick}
    >
      <FileText className="h-3 w-3" />
      <span>{count}</span>
    </Badge>
  );
}
