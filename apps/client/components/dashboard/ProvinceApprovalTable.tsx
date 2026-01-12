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
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

interface ProvinceApprovalItem {
  districtId: number;
  districtName: string;
  allocatedBudget: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalCount: number;
  approvalRate: number;
}

interface ProvinceApprovalTableProps {
  data: ProvinceApprovalItem[];
  onDistrictClick?: (districtId: number) => void;
}

type SortField = "districtName" | "allocatedBudget" | "approvedCount" | "rejectedCount" | "approvalRate";
type SortDirection = "asc" | "desc";

export function ProvinceApprovalTable({ data, onDistrictClick }: ProvinceApprovalTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("districtName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const itemsPerPage = 20;

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>District Approval Summary</CardTitle>
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
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortDirection === "asc" ? 1 : -1;

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
        <CardTitle>District Approval Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>
                  <SortButton field="districtName">District Name</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="allocatedBudget">Allocated Budget</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="approvedCount">Approved</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="rejectedCount">Rejected</SortButton>
                </TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">
                  <SortButton field="approvalRate">Approval Rate</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow
                  key={item.districtId}
                  className={onDistrictClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onDistrictClick?.(item.districtId)}
                >
                  <TableCell className="font-medium">{item.districtId}</TableCell>
                  <TableCell>{item.districtName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.allocatedBudget)}</TableCell>
                  <TableCell className="text-right text-green-600">{item.approvedCount}</TableCell>
                  <TableCell className="text-right text-red-600">{item.rejectedCount}</TableCell>
                  <TableCell className="text-right text-yellow-600">{item.pendingCount}</TableCell>
                  <TableCell className="text-right font-medium">
                    {item.approvalRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} districts
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
