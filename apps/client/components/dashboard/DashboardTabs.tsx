"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardTabsProps {
  activeTab: "province" | "district";
  onTabChange: (tab: "province" | "district") => void;
}

export function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "province" | "district")}>
      <TabsList>
        <TabsTrigger value="province">Province</TabsTrigger>
        <TabsTrigger value="district">District</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
