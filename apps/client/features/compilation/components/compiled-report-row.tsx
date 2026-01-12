"use client"

import { useMemo } from "react"
import { FinancialRow } from "../../execution/schemas/execution-form-schema"
import { cn } from "@/lib/utils"

type CompiledReportRowProps = {
  rowData: {
    id: string
    title: string
    isCategory?: boolean
    children?: FinancialRow[]
  }
  facilities: {
    facilityName: string
    data: FinancialRow[]
  }[]
  depth?: number
}

function formatNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("rw-RW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CompiledReportRow({
  rowData,
  facilities,
  depth = 0
}: CompiledReportRowProps) {
  // Find and calculate facility values for this row
  const facilityValues = useMemo(() => {
    return facilities.map(facility => {
      const targetId = String(rowData.id).toLowerCase()
      const targetTitle = rowData.title.toLowerCase()

      const findRow = (rows: FinancialRow[]): FinancialRow | null => {
        for (const row of rows) {
          if (String(row.id).toLowerCase() === targetId) return row
          if (row.title.toLowerCase() === targetTitle) return row
          if (row.children) {
            const found = findRow(row.children)
            if (found) return found
          }
        }
        return null
      }
      
      const matched = findRow(facility.data)
      if (matched && matched.cumulativeBalance === undefined && matched.children) {
        const sumChildren = (nodes: FinancialRow[]): number => {
          return nodes.reduce((acc, n) => acc + (n.cumulativeBalance || 0) + (n.children ? sumChildren(n.children) : 0), 0)
        }
        matched.cumulativeBalance = sumChildren(matched.children)
      }
      return matched
    })
  }, [facilities, rowData.id, rowData.title])

  // Calculate total for this row across all facilities
  const rowTotal = useMemo(() => {
    return facilityValues.reduce((acc, value) => {
      acc.cumulativeBalance += value?.cumulativeBalance || 0
      return acc
    }, { cumulativeBalance: 0 })
  }, [facilityValues])

  // Combine all comments
  const combinedComments = useMemo(() => {
    return facilityValues
      .map((value, index) => value?.comments ? `${facilities[index].facilityName}: ${value.comments}` : null)
      .filter(Boolean)
      .join(" | ")
  }, [facilityValues, facilities])

  return (
    <tr className={cn(
      "hover:bg-gray-50",
      rowData.isCategory && "font-semibold bg-gray-50"
    )}>
      {/* Fixed Event Details Column */}
      <td 
        className={cn(
          "sticky left-0 z-10 px-6 py-4 text-sm text-gray-900 border-r",
          rowData.isCategory ? "bg-gray-50" : "bg-white"
        )}
        style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }}
      >
        {rowData.title}
      </td>
      
      {/* Scrollable Facility Value Columns */}
      {facilityValues.map((value, index) => (
        <td key={index} className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">
          {formatNumber(value?.cumulativeBalance)}
        </td>
      ))}
      
      {/* Fixed Total Column */}
      <td className={cn(
          "sticky right-[300px] z-10 px-6 py-3 text-center text-sm font-semibold whitespace-nowrap border-x",
          rowData.isCategory ? "bg-gray-50" : "bg-white"
        )}
      >
        {formatNumber(rowTotal.cumulativeBalance)}
      </td>
      
      {/* Fixed Comments Column */}
      <td className={cn(
        "sticky right-0 z-10 px-6 py-4 text-sm text-gray-500 max-w-md truncate border-l",
        rowData.isCategory ? "bg-gray-50" : "bg-white"
        )}
      >
        {combinedComments || "-"}
      </td>
    </tr>
  )
} 