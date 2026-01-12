"use client";

import { DataTableActionBar, DataTableActionBarAction, DataTableActionBarSelection } from "@/components/data-table/data-table-action-bar";
import type { Table } from "@tanstack/react-table";
import { Trash2, Download, FileText } from "lucide-react";
import type { PlanningActivity } from "./planning-table-columns";

interface PlanningTableActionBarProps {
  table: Table<PlanningActivity>;
}

export function PlanningTableActionBar({ table }: PlanningTableActionBarProps) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBulkDelete = () => {
    // TODO: Implement bulk delete functionality
    console.log("Bulk delete selected items:", selectedRows.map(row => row.original.id));
  };

  const handleBulkExport = () => {
    // TODO: Implement bulk export functionality
    console.log("Bulk export selected items:", selectedRows.map(row => row.original.id));
  };

  const handleBulkReport = () => {
    // TODO: Implement bulk report generation
    console.log("Generate report for selected items:", selectedRows.map(row => row.original.id));
  };

  return (
    <DataTableActionBar table={table}>
      <DataTableActionBarSelection table={table} />
      
      <DataTableActionBarAction
        onClick={handleBulkExport}
        tooltip="Export selected planning activities"
      >
        <Download className="h-4 w-4" />
        Export ({selectedCount})
      </DataTableActionBarAction>
      
      <DataTableActionBarAction
        onClick={handleBulkReport}
        tooltip="Generate report for selected activities"
      >
        <FileText className="h-4 w-4" />
        Report ({selectedCount})
      </DataTableActionBarAction>
      
      <DataTableActionBarAction
        onClick={handleBulkDelete}
        tooltip="Delete selected planning activities"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete ({selectedCount})
      </DataTableActionBarAction>
    </DataTableActionBar>
  );
}
