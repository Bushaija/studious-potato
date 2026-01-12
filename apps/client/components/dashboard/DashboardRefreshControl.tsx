"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardRefreshControlProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date;
}

export function DashboardRefreshControl({
  onRefresh,
  isRefreshing = false,
  lastUpdated,
}: DashboardRefreshControlProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second to show relative time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (date: Date): string => {
    const seconds = Math.floor((currentTime.getTime() - date.getTime()) / 1000);

    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      {/* {lastUpdated && (
        <span className="hidden sm:inline">
          Last updated: {getRelativeTime(lastUpdated)}
        </span>
      )} */}
      {/* <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="gap-2"
      >
        <RefreshCw
          className={cn("h-4 w-4", isRefreshing && "animate-spin")}
        />
        <span className="hidden sm:inline">Refresh</span>
      </Button> */}
      {/* {isRefreshing && (
        <span className="text-xs animate-pulse">Updating...</span>
      )} */}
    </div>
  );
}
