"use client";

import React from "react";
import { useExecutionFormContext } from "@/features/execution/execution-form-context";
import { useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function ExecutionHeader() {
  const ctx = useExecutionFormContext();
  const searchParams = useSearchParams();

  function toTitleCase(value: string) {
    return value
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map(w => w[0]?.toUpperCase() + w.slice(1))
      .join(" ");
  }

  const programParam = searchParams?.get("program") || "";
  const facilityNameParam = searchParams?.get("facilityName") || "";
  const facilityTypeParam = (searchParams?.get("facilityType") || "").replace(/_/g, " ");

  const program = toTitleCase(programParam);
  const facility = [toTitleCase(facilityNameParam), facilityTypeParam].filter(Boolean).join(" ");

  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold">Execution of Planned Activities</h2>
        <div className="flex items-center h-4 gap-4 my-2">
        {program ? (
          <span className="text-sm text-muted-foreground capitalize">{program}</span>
        ) : null}
        <Separator orientation="vertical" />
        {facility ? (
          <span className="text-sm text-muted-foreground capitalize">{facility}</span>
        ) : null}
        <Badge className="text-[10px] text-muted-foreground/80 bg-green-100 text-green-800">{ctx?.isBalanced ? "Ready" : "Unbalanced"}</Badge>
        </div>
      </div>
    </div>
  );
}

export default ExecutionHeader;


