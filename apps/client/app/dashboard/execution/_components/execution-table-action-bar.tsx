"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import type { ExecutionActivity } from "./execution-table-columns"
import { DataTableActionBar, DataTableActionBarAction, DataTableActionBarSelection } from "@/components/data-table/data-table-action-bar"
import { Download, FileText, Trash2 } from "lucide-react"

interface ExecutionTableActionBarProps {
  table: Table<ExecutionActivity>
}

export function ExecutionTableActionBar({ table }: ExecutionTableActionBarProps) {
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleBulkDelete = () => {
    // TODO: Implement bulk delete functionality
    // eslint-disable-next-line no-console
    console.log("Bulk delete selected items:", selectedRows.map((row) => (row as any).original.id))
  }

  const handleBulkExport = () => {
    // TODO: Implement bulk export functionality
    // eslint-disable-next-line no-console
    console.log("Bulk export selected items:", selectedRows.map((row) => (row as any).original.id))
  }

  const handleBulkReport = () => {
    // TODO: Implement bulk report generation
    // eslint-disable-next-line no-console
    console.log("Generate report for selected items:", selectedRows.map((row) => (row as any).original.id))
  }

  return (
    <DataTableActionBar table={table}>
      <DataTableActionBarSelection table={table} />

      <DataTableActionBarAction onClick={handleBulkExport} tooltip="Export selected execution records">
        <Download className="h-4 w-4" />
        Export ({selectedCount})
      </DataTableActionBarAction>

      <DataTableActionBarAction onClick={handleBulkReport} tooltip="Generate report for selected records">
        <FileText className="h-4 w-4" />
        Report ({selectedCount})
      </DataTableActionBarAction>

      <DataTableActionBarAction onClick={handleBulkDelete} tooltip="Delete selected execution records" className="text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
        Delete ({selectedCount})
      </DataTableActionBarAction>
    </DataTableActionBar>
  )
}


