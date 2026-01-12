/**
 * Example usage of the VersionComparison component
 * 
 * This file demonstrates how to integrate the VersionComparison component
 * into a financial report page.
 */

import { VersionComparison } from "./version-comparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReportVersionsPageProps {
  reportId: number;
}

/**
 * Example 1: Basic usage in a dedicated versions page
 */
export function ReportVersionsPage({ reportId }: ReportVersionsPageProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Report Version History</h1>
        <p className="text-muted-foreground mt-2">
          Compare different versions of this financial report to track changes over time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Version Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <VersionComparison reportId={reportId} />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Example 2: Integrated into a tabbed report view
 */
export function ReportWithVersionsTab({ reportId }: ReportVersionsPageProps) {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="report" className="w-full">
        <TabsList>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
          <TabsTrigger value="comparison">Compare Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="space-y-4">
          {/* Main report content */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Report</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Report content goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          {/* Version history list */}
          <Card>
            <CardHeader>
              <CardTitle>All Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Version list goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compare Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <VersionComparison reportId={reportId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Example 3: With pre-selected versions
 */
export function CompareSpecificVersions({ reportId }: ReportVersionsPageProps) {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare Latest Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <VersionComparison 
            reportId={reportId}
            defaultVersion1="1.0"
            defaultVersion2="1.1"
          />
        </CardContent>
      </Card>
    </div>
  );
}
