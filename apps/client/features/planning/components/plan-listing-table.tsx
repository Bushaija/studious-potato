"use client"

import { useState, useMemo } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { 
  MoreHorizontal, 
  Search, 
  Eye, 
  FileEdit, 
  FileDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { FilterTabs, FilterTab } from "@/components/ui/filter-tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toTitleCase } from "@/components/reports/report-header"

// Types
export interface PlanRecord {
  id: string
  facilityName: string
  district: string
  lastModified: Date
  facilityType: string
  projectCode?: string;
}

interface PlanListingTableProps {
  data: PlanRecord[]
  onView: (id: string, facilityType: string, projectCode?: string) => void
  onUpdate: (id: string, facilityType: string, projectCode?: string) => void
  onExport: (id: string) => void;
}

export function PlanListingTable({
  data,
  onView,
  onUpdate,
  onExport
}: PlanListingTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [activeTab, setActiveTab] = useState("hiv")

  // Helper function to map project codes to tab values
  const getProjectCodeForTab = (tabValue: string): string => {
    const mapping = {
      'hiv': 'HIV',
      'malaria': 'MAL', 
      'tb': 'TB'
    }
    return mapping[tabValue as keyof typeof mapping] || tabValue.toUpperCase()
  }

  // Memoize filtered data to prevent unnecessary re-filtering
  const filteredData = useMemo(() => {
    const filtered = data.filter(item => {
      if (!item.projectCode) return true // Show all if no project code specified
      return item.projectCode === getProjectCodeForTab(activeTab)
    });
    return filtered
  }, [data, activeTab])

  // Define columns
  const columns: ColumnDef<PlanRecord>[] = [
    {
      accessorKey: "facilityName",
      header: () => <div className="text-gray-500 font-normal text-sm">Facility Name</div>,
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span className="font-semibold">{toTitleCase(row.original.facilityName)}</span>
            <span className="text-sm text-gray-500">{row.original.district} district</span>
          </div>
        )
      },
    },  
    {
      accessorKey: "facilityType",
      header: () => <div className="text-gray-500 font-normal text-sm">Facility Type</div>,
      cell: ({ row }) => {
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">{row.original.facilityType === "hospital" ? "Hospital" : "Health Center"}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "lastModified",
      header: () => <div className="text-gray-500 font-normal text-sm">Date modified</div>,
      cell: ({ row }) => {
        return (
          <div className="text-gray-500">
            {format(row.original.lastModified, "MMM d, yyyy")}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-gray-500 font-normal text-sm">Actions</div>,
      cell: ({ row }) => {
        const record = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(record.id, record.facilityType, record.projectCode)}>
                <Eye className="mr-2 h-4 w-4" />
                <span>View</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdate(record.id, record.facilityType, record.projectCode)}>
                <FileEdit className="mr-2 h-4 w-4" />
                <span>Update</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(record.id)}>
                <FileDown className="mr-2 h-4 w-4" />
                <span>Export</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  })

  // Define tabs configuration - only tab structure, no content
  const tabs: FilterTab[] = [
    {
      value: "hiv",
      label: "HIV",
      content: <div /> // Empty content, table will be rendered below
    },
    {
      value: "malaria", 
      label: "Malaria",
      content: <div />
    },
    {
      value: "tb",
      label: "TB", 
      content: <div />
    }
  ]

  const getEmptyMessage = (program: string) => {
    return `No ${program} plans found.`
  }

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center py-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search facilities..."
            value={(table.getColumn("facilityName")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("facilityName")?.setFilterValue(event.target.value)
            }
            className="pl-8 border-[1px] placeholder:text-gray-500 placeholder:text-sm rounded-sm w-[300px] border-gray-500"
          />
        </div>
      </div>

      {/* Disease Program Tabs using reusable FilterTabs */}
      <FilterTabs
        tabs={tabs}
        defaultValue="hiv"
        value={activeTab}
        onValueChange={setActiveTab}
      />

      {/* Render table below tabs */}
      <div className="rounded-md w-full">
        <Table className="w-full">
          <TableHeader className="w-full">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-[1px] border-gray-100">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-t-[1px] border-gray-300"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {getEmptyMessage(activeTab.toUpperCase())}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-gray-500">
          Showing {table.getState().pagination.pageSize} rows per page
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 