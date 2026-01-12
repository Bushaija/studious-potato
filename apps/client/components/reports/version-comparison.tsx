"use client";

import { useState } from "react";
import { ArrowRight, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReportVersions } from "@/hooks/queries/financial-reports/use-report-versions";
import { useVersionComparison } from "@/hooks/queries/financial-reports/use-version-comparison";
import { formatCurrency } from "@/lib/planning/formatters";
import { cn } from "@/lib/utils";

interface VersionComparisonProps {
  reportId: number;
  defaultVersion1?: string;
  defaultVersion2?: string;
}

/**
 * Version Comparison Component
 * 
 * Displays a comparison between two versions of a financial report.
 * Shows version selector dropdowns, summary card with differences,
 * and a detailed table with line-by-line changes.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * @example
 * <VersionComparison reportId={123} />
 * 
 * @example
 * <VersionComparison 
 *   reportId={123} 
 *   defaultVersion1="1.0"
 *   defaultVersion2="1.1"
 * />
 */
export function VersionComparison({
  reportId,
  defaultVersion1,
  defaultVersion2,
}: VersionComparisonProps) {
  const [version1, setVersion1] = useState<string | undefined>(defaultVersion1);
  const [version2, setVersion2] = useState<string | undefined>(defaultVersion2);

  // Fetch available versions
  const { data: versionsData, isLoading: isLoadingVersions } = useReportVersions(reportId);

  // Fetch comparison data
  const { data: comparisonData, isLoading: isLoadingComparison } = useVersionComparison(
    reportId,
    version1,
    version2
  );

  // Export comparison report as CSV
  const handleExport = () => {
    if (!comparisonData) return;

    const headers = [
      "Line",
      "Field",
      `Version ${version1}`,
      `Version ${version2}`,
      "Difference",
      "% Change",
    ];

    const rows = comparisonData.differences.map((diff) => [
      diff.lineName,
      diff.field,
      diff.version1Value.toString(),
      diff.version2Value.toString(),
      diff.difference.toString(),
      `${diff.percentageChange.toFixed(2)}%`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `version-comparison-${version1}-vs-${version2}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingVersions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const versions = versionsData?.versions || [];

  return (
    <div className="space-y-6">
      {/* Version Selectors */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">
            Version 1 (Base)
          </label>
          <Select value={version1} onValueChange={setVersion1}>
            <SelectTrigger>
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.versionNumber} value={v.versionNumber}>
                  {v.versionNumber} - {new Date(v.snapshotTimestamp).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center pt-6">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">
            Version 2 (Compare)
          </label>
          <Select value={version2} onValueChange={setVersion2}>
            <SelectTrigger>
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.versionNumber} value={v.versionNumber}>
                  {v.versionNumber} - {new Date(v.snapshotTimestamp).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Results */}
      {version1 && version2 && (
        <>
          {isLoadingComparison ? (
            <Skeleton className="h-32 w-full" />
          ) : comparisonData ? (
            <>
              {/* Summary Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-semibold">
                    Comparison Summary
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{version1}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{version2}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Total Differences
                      </p>
                      <p className="text-3xl font-bold">
                        {comparisonData.summary.totalDifferences}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Line items with changes
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Significant Changes (&gt;5%)
                      </p>
                      <p className="text-3xl font-bold text-amber-600">
                        {comparisonData.summary.significantChanges}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Require attention
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Comparison
                </Button>
              </div>

              {/* Differences Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Line-by-Line Differences</CardTitle>
                </CardHeader>
                <CardContent>
                  {comparisonData.differences.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No differences found between these versions.</p>
                      <p className="text-sm mt-2">
                        The selected versions contain identical data.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[250px]">Line</TableHead>
                            <TableHead className="w-[120px]">Field</TableHead>
                            <TableHead className="text-right">
                              Version {version1}
                            </TableHead>
                            <TableHead className="text-right">
                              Version {version2}
                            </TableHead>
                            <TableHead className="text-right">
                              Difference
                            </TableHead>
                            <TableHead className="text-right w-[120px]">
                              % Change
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparisonData.differences.map((diff, index) => {
                            const isSignificant = Math.abs(diff.percentageChange) > 5;
                            const isIncrease = diff.difference > 0;

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {diff.lineName}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {diff.field}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(diff.version1Value)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(diff.version2Value)}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right font-mono text-sm",
                                    isIncrease
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  )}
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    {isIncrease ? (
                                      <TrendingUp className="h-3 w-3" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3" />
                                    )}
                                    {formatCurrency(Math.abs(diff.difference))}
                                  </div>
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right font-mono text-sm",
                                    isSignificant && "font-bold",
                                    isIncrease
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  )}
                                >
                                  {isIncrease ? "+" : ""}
                                  {diff.percentageChange.toFixed(2)}%
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}

      {/* Prompt to select versions */}
      {(!version1 || !version2) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <p>Select two versions above to compare their differences.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
