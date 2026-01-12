import { useState, useMemo } from "react"

export interface UseFilterTabsProps<T> {
  data: T[]
  defaultTab: string
  filterFn: (item: T, activeTab: string) => boolean
}

export function useFilterTabs<T>({ 
  data, 
  defaultTab, 
  filterFn 
}: UseFilterTabsProps<T>) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const filteredData = useMemo(() => {
    return data.filter(item => filterFn(item, activeTab))
  }, [data, activeTab, filterFn])

  return {
    activeTab,
    setActiveTab,
    filteredData
  }
} 