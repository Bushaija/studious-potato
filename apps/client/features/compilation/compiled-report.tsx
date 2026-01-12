"use client"

import React from "react"
import { cn } from "@/lib/utils"

// Types matching the API response structure
type FacilityColumn = {
  id: number
  name: string
  facilityType: string
  projectType: string
  hasData: boolean
}

type ActivityRow = {
  code: string
  name: string
  category: string
  subcategory?: string
  displayOrder: number
  isSection: boolean
  isSubcategory: boolean
  isComputed: boolean
  computationFormula?: string
  values: Record<string, number>
  total: number
  level: number
  items?: ActivityRow[]
}

type CompiledData = {
  facilities: FacilityColumn[]
  activities: ActivityRow[]
  sections: Array<{
    code: string
    name: string
    total: number
    isComputed: boolean
    computationFormula?: string
  }>
  totals: {
    byFacility: Record<string, number>
    grandTotal: number
  }
}

type CompiledReportProps = {
  compiledData: CompiledData
}

function formatNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "-"
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Recursive function to render activity rows
function renderActivityRows(activities: ActivityRow[], facilities: FacilityColumn[]): React.ReactElement[] {
  return activities.flatMap(activity => {
    const rows: React.ReactElement[] = []
    
    // Render the current activity
    rows.push(
      <tr 
        key={activity.code}
        className={cn(
          "hover:bg-gray-50",
          activity.isSection && "font-bold bg-blue-50",
          activity.isSubcategory && "font-semibold bg-gray-100"
        )}
      >
        {/* Activity Name Column */}
        <td 
          className={cn(
            "sticky left-0 z-10 px-6 py-3 text-sm border-r",
            activity.isSection && "bg-blue-50 font-bold",
            activity.isSubcategory && "bg-gray-100 font-semibold",
            !activity.isSection && !activity.isSubcategory && "bg-white"
          )}
          style={{ 
            paddingLeft: `${(activity.level + 1) * 1.5}rem` 
          }}
        >
          <div className="flex items-center gap-2">
            <span>{activity.name}</span>
            {activity.isComputed && (
              <span className="text-xs text-blue-600 italic">
                ({activity.computationFormula})
              </span>
            )}
          </div>
        </td>
        
        {/* Facility Value Columns */}
        {facilities.map(facility => (
          <td 
            key={facility.id} 
            className="px-4 py-3 text-sm text-center whitespace-nowrap"
          >
            {formatNumber(activity.values[facility.id.toString()])}
          </td>
        ))}
        
        {/* Total Column */}
        <td 
          className={cn(
            "sticky right-0 z-10 px-6 py-3 text-center text-sm font-semibold whitespace-nowrap border-l",
            activity.isSection && "bg-blue-50",
            activity.isSubcategory && "bg-gray-100",
            !activity.isSection && !activity.isSubcategory && "bg-white"
          )}
        >
          {formatNumber(activity.total)}
        </td>
      </tr>
    )
    
    // Recursively render child items if they exist
    if (activity.items && activity.items.length > 0) {
      rows.push(...renderActivityRows(activity.items, facilities))
    }
    
    return rows
  })
}

export function CompiledReport({ compiledData }: CompiledReportProps) {
  const { facilities, activities } = compiledData

  if (!facilities || facilities.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border">
        <p className="text-gray-600">No facilities found for this project type.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Report Table */}
      <div className="relative overflow-x-auto shadow-md rounded-lg border">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {/* Fixed Activity Column */}
              <th scope="col" className="sticky left-0 z-20 px-6 py-3 bg-gray-50 border-r min-w-[300px]">
                Activity
              </th>
              
              {/* Scrollable Facility Columns */}
              {facilities.map(facility => (
                <th 
                  key={facility.id} 
                  scope="col" 
                  className="px-4 py-3 text-center min-w-[150px]"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{facility.name}</span>
                    <span className="text-xs text-gray-500 normal-case">
                      {facility.facilityType.replace('_', ' ')}
                    </span>
                  </div>
                </th>
              ))}
              
              {/* Fixed Total Column */}
              <th 
                scope="col" 
                className="sticky right-0 z-20 px-6 py-3 bg-gray-50 border-l min-w-[150px] text-center"
              >
                Total
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 bg-white">
            {renderActivityRows(activities, facilities)}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      {/* <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h3 className="font-semibold mb-2">Report Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Facilities:</span>
            <span className="ml-2 font-semibold">{facilities.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Grand Total:</span>
            <span className="ml-2 font-semibold">{formatNumber(compiledData.totals.grandTotal)}</span>
          </div>
        </div>
      </div> */}
    </div>
  )
}
