"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

interface DistrictApprovalItem {
  facilityId: number;
  facilityName: string;
  projectId: number;
  projectName: string;
  projectCode: string;
  allocatedBudget: number;
  approvalStatus: "APPROVED" | "PENDING" | "REJECTED";
  approvedBy: string | null;
  approvedAt: string | null;
  quarter: number | null;
}

interface DistrictApprovalTableProps {
  data: DistrictApprovalItem[];
}

type SortField = "facilityName" | "allocatedBudget" | "approvalStatus" | "approvedAt";
type SortDirection = "asc" | "desc";

export function DistrictApprovalTable({ data }: DistrictApprovalTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("facilityName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const itemsPerPage = 20;

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facility Approval Details</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground text-sm">
            No approval data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "yyyy-MM-dd HH:mm");
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: "APPROVED" | "PENDING" | "REJECTED") => {
    const variants = {
      APPROVED: { variant: "default" as const, className: "bg-green-500 hover:bg-green-600" },
      PENDING: { variant: "secondary" as const, className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
      REJECTED: { variant: "destructive" as const, className: "" },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    let aValue: string | number = a[sortField] ?? "";
    let bValue: string | number = b[sortField] ?? "";
    const multiplier = sortDirection === "asc" ? 1 : -1;

    if (sortField === "approvedAt") {
      aValue = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
      bValue = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * multiplier;
    }
    return ((aValue as number) - (bValue as number)) * multiplier;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 lg:px-3"
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facility Approval Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>
                  <SortButton field="facilityName">Health Facility</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="allocatedBudget">Allocated Budget</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="approvalStatus">Status</SortButton>
                </TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>
                  <SortButton field="approvedAt">Approved At</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={`${item.facilityId}-${item.projectId}`}>
                  <TableCell className="font-medium">{item.facilityId}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.facilityName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.projectName} ({item.projectCode})
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.allocatedBudget)}</TableCell>
                  <TableCell>{getStatusBadge(item.approvalStatus)}</TableCell>
                  <TableCell>{item.approvedBy || "-"}</TableCell>
                  <TableCell>{formatDate(item.approvedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} facilities
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
