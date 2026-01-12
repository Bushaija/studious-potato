"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const EnhancedDashboard = dynamic(
  () => import("@/components/dashboard/EnhancedDashboard").then((mod) => ({ default: mod.EnhancedDashboard })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

const DashboardPage = () => {
  return (
    <div className="container mx-auto p-2">
      <EnhancedDashboard />
    </div>
  );
};

export default DashboardPage;