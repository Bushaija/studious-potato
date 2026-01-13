"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { DataTableRowAction } from "@/types/data-table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Edit, Eye, MoreHorizontal, Trash2, Upload, FileText } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/components/providers/session-provider"
import { UploadDocumentDialog } from "./upload-document-dialog"
import { ExecutionDocumentsSheet } from "./execution-documents-sheet"
import { DocumentCountBadge } from "./document-count-badge"

export interface ExecutionActivity {
  id: number;
  schemaId: number;
  entityId: number | null;
  entityType: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  formData: {
    metadata: Record<string, any>;
    activities: Record<string, any> | Array<Record<string, any>>;
    quarter?: string;
  };
  computedValues: Record<string, any>;
  validationState: {
    isValid: boolean;
    lastValidated: string;
  };
  metadata?: {
    projectType: string;
    submittedAt: string;
    facilityType: string;
    quarter?: string;
  };
  createdBy: number;
  createdAt: string;
  updatedBy: number;
  updatedAt: string;
  schema: {
    id: number;
    name: string;
    version: string;
    projectType: string;
    facilityType: string;
    moduleType: string;
    isActive: boolean;
  };
  project: {
    id: number;
    name: string;
    status: string;
    code: string;
    description: string;
    projectType: string;
  };
  facility: {
    id: number;
    name: string;
    facilityType: string;
    districtId: number;
  };
  district?: {
    id: number;
    name: string;
  } | null;
  reportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  creator: {
    id: number;
    name: string;
    email: string;
  };
  formDataNamed: {
    metadata: Record<string, any>;
    activities: Record<string, any>;
  };
}

export function getExecutionTableColumns({
  setRowAction,
  router,
  isAdmin = false,
}: {
  setRowAction: (action: DataTableRowAction<ExecutionActivity>) => void;
  router: any;
  isAdmin?: boolean;
}): ColumnDef<ExecutionActivity>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: "facilityName",
      accessorKey: "facility.name",
      header: "Facility Name",
      cell: ({ row }) => {
        const facility = row.original.facility;
        return (
          <div className="font-medium">
            {facility?.name || "N/A"}
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Facility Name",
        variant: "text",
        placeholder: "Search facilities...",
      },
    },
    {
      id: "facilityType",
      accessorKey: "facility.facilityType",
      header: "Facility Type",
      cell: ({ row }) => {
        const facilityType = row.original.facility?.facilityType;
        if (!facilityType) return "N/A";
        
        const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          hospital: { label: "Hospital", variant: "default" },
          health_center: { label: "Health Center", variant: "secondary" },
        };
        
        const typeInfo = typeMap[facilityType] || { label: facilityType, variant: "outline" as const };
        
        return (
          <Badge variant={typeInfo.variant}>
            {typeInfo.label}
          </Badge>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Facility Type",
        variant: "select",
        options: [
          { label: "Hospital", value: "hospital" },
          { label: "Health Center", value: "health_center" },
        ],
      },
    },
    // District column - only show for admin users
    ...(isAdmin ? [{
      id: "district",
      accessorKey: "district.name",
      header: "District",
      cell: ({ row }: { row: any }) => {
        const district = row.original.district;
        return (
          <div className="font-medium">
            {district?.name || "N/A"}
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
    }] : []),
    {
      accessorKey: "reportingPeriod.year",
      header: "Reporting Period",
      cell: ({ row }) => {
        const reportingPeriod = row.original.reportingPeriod;
        if (!reportingPeriod) return "N/A";
        
        return (
          <div className="space-y-1">
            <div className="font-medium">
              FY {reportingPeriod.year}
            </div>
            <div className="text-sm text-muted-foreground">
              {reportingPeriod.startDate} - {reportingPeriod.endDate}
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "projectType",
      accessorKey: "project.projectType",
      header: "Program",
      cell: ({ row }) => {
        const projectType = row.original.project?.projectType;
        if (!projectType) return "N/A";
        
        const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          HIV: { label: "HIV", variant: "default" },
          TB: { label: "TB", variant: "secondary" },
          Malaria: { label: "Malaria", variant: "outline" },
        };
        
        const typeInfo = typeMap[projectType] || { label: projectType, variant: "outline" as const };
        
        return (
          <Badge variant={typeInfo.variant}>
            {typeInfo.label}
          </Badge>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Program",
        variant: "select",
        options: [
          { label: "HIV", value: "HIV" },
          { label: "TB", value: "TB" },
          { label: "Malaria", value: "Malaria" },
        ],
      },
    },
    {
      id: "quarter",
      header: "Quarter",
      cell: ({ row }) => {
        const metadata = row.original.metadata as any;
        const formData = row.original.formData as any;
        
        // Helper function to check if an activity is "Accumulated Surplus/Deficit"
        // This is a stock item that has the same value across all quarters (from year-to-year rollover)
        // It should NOT be used to determine which quarters have been entered
        const isAccumulatedSurplusDeficit = (code: string): boolean => {
          const codeLower = code.toLowerCase();
          // Pattern: _G_1 (e.g., HIV_EXEC_HOSPITAL_G_1) but NOT _G_G-01_ (Prior Year Adjustments)
          return codeLower.includes('_g_1') && !codeLower.includes('_g_g-01');
        };
        
        // Helper function to determine which quarters have data
        const getExecutionQuarters = () => {
          const activities = formData?.activities || {};
          const executedQuarters: string[] = [];
          
          // Check if we have the array format or object format
          if (Array.isArray(activities)) {
            // Array format: activities = [{code: "A1", q1: 100, q2: 0, ...}, ...]
            for (const activity of activities) {
              // Skip Accumulated Surplus/Deficit - it's a stock item with same value all quarters
              if (activity.code && isAccumulatedSurplusDeficit(activity.code)) continue;
              
              if (activity.q1 && activity.q1 > 0 && !executedQuarters.includes('Q1')) executedQuarters.push('Q1');
              if (activity.q2 && activity.q2 > 0 && !executedQuarters.includes('Q2')) executedQuarters.push('Q2');
              if (activity.q3 && activity.q3 > 0 && !executedQuarters.includes('Q3')) executedQuarters.push('Q3');
              if (activity.q4 && activity.q4 > 0 && !executedQuarters.includes('Q4')) executedQuarters.push('Q4');
            }
          } else if (typeof activities === 'object') {
            // Object format: activities = {A1: {q1: 100, q2: 0, ...}, A2: {...}}
            for (const activityCode of Object.keys(activities)) {
              // Skip Accumulated Surplus/Deficit - it's a stock item with same value all quarters
              if (isAccumulatedSurplusDeficit(activityCode)) continue;
              
              const activity = activities[activityCode];
              if (activity && typeof activity === 'object') {
                if (activity.q1 && activity.q1 > 0 && !executedQuarters.includes('Q1')) executedQuarters.push('Q1');
                if (activity.q2 && activity.q2 > 0 && !executedQuarters.includes('Q2')) executedQuarters.push('Q2');
                if (activity.q3 && activity.q3 > 0 && !executedQuarters.includes('Q3')) executedQuarters.push('Q3');
                if (activity.q4 && activity.q4 > 0 && !executedQuarters.includes('Q4')) executedQuarters.push('Q4');
              }
            }
          }
          
          return executedQuarters.sort(); // Sort to maintain Q1, Q2, Q3, Q4 order
        };
        
        const executedQuarters = getExecutionQuarters();
        let quarterDisplay = "";
        
        if (executedQuarters.length === 0) {
          // Fallback to metadata quarter if no activities data
          const quarterFromMetadata = metadata?.quarter;
          const quarterFromFormData = formData?.metadata?.quarter || formData?.quarter;
          const currentQuarter = quarterFromMetadata || quarterFromFormData;
          
          if (!currentQuarter) return "N/A";
          quarterDisplay = currentQuarter;
        } else {
          quarterDisplay = executedQuarters.join(' ');
        }
        
        // Color coding based on quarter progression
        const getBadgeVariant = () => {
          if (executedQuarters.length === 1) return "outline";
          if (executedQuarters.length === 2) return "secondary";
          if (executedQuarters.length === 3) return "default";
          if (executedQuarters.length === 4) return "destructive";
          return "outline";
        };
        
        return (
          <Badge variant={getBadgeVariant()} className="font-mono">
            {quarterDisplay}
          </Badge>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Quarter",
        variant: "select",
        options: [
          { label: "Q1", value: "Q1" },
          { label: "Q1 Q2", value: "Q1 Q2" },
          { label: "Q1 Q2 Q3", value: "Q1 Q2 Q3" },
          { label: "Q1 Q2 Q3 Q4", value: "Q1 Q2 Q3 Q4" },
        ],
      },
    },
    {
      accessorKey: "activitiesCount",
      header: "Activities Count",
      cell: ({ row }) => {
        const activities = row.original.formData?.activities;
        const count = activities ? Object.keys(activities).length : 0;
        
        return (
          <div className="text-center">
            <Badge variant="outline" className="font-mono">
              {count}
            </Badge>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "documents",
      header: "Documents",
      cell: ({ row }) => {
        const execution = row.original;
        const [documentsSheetOpen, setDocumentsSheetOpen] = React.useState(false);
        
        return (
          <>
            <div className="flex justify-center">
              <DocumentCountBadge
                executionEntryId={execution.id}
                onClick={() => setDocumentsSheetOpen(true)}
              />
            </div>
            
            <ExecutionDocumentsSheet
              open={documentsSheetOpen}
              onOpenChange={setDocumentsSheetOpen}
              executionEntryId={execution.id}
              facilityName={execution.facility?.name}
            />
          </>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        return (
          <div className="text-sm text-muted-foreground">
            {new Date(createdAt).toLocaleDateString()}
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const execution = row.original;
        const user = useUser();
        const isDaf = user?.role === 'daf';
        const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
        const [documentsSheetOpen, setDocumentsSheetOpen] = React.useState(false);
        
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Open menu"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard/execution/details/${execution.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                
                {/* Hide Edit for DAF users */}
                {!isDaf && (
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/execution/edit/${execution.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={() => setDocumentsSheetOpen(true)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Documents
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </DropdownMenuItem>
                
                {/* Hide Delete for DAF users */}
                {!isDaf && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setRowAction({ variant: "delete", row })}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <UploadDocumentDialog
              open={uploadDialogOpen}
              onOpenChange={setUploadDialogOpen}
              executionEntryId={execution.id}
            />
            
            <ExecutionDocumentsSheet
              open={documentsSheetOpen}
              onOpenChange={setDocumentsSheetOpen}
              executionEntryId={execution.id}
              facilityName={execution.facility?.name}
            />
          </>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    },
  ];
}

