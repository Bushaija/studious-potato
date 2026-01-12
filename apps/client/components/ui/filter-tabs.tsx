"use client"

import { ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface FilterTab {
  value: string
  label: string
  content: ReactNode
}

interface FilterTabsProps {
  tabs: FilterTab[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  tabsListClassName?: string
  tabTriggerClassName?: string
  tabContentClassName?: string
}

// Helper function to map project codes to tab values
export const getProjectCodeForTab = (tabValue: string): string => {
  const mapping = {
    'hiv': 'HIV',
    'malaria': 'MAL',
    'tb': 'TB'
  }
  return mapping[tabValue as keyof typeof mapping] || tabValue.toUpperCase()
}

export function FilterTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className = "w-full",
  tabsListClassName,
  tabTriggerClassName,
  tabContentClassName
}: FilterTabsProps) {

  return (
    <Tabs
      defaultValue={defaultValue || tabs[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      {/* shadcn default tab list */}
      <TabsList className={cn(tabsListClassName)}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(tabTriggerClassName)}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab content */}
      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className={cn(tabContentClassName)}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}