/**
 * Version History Component - Usage Examples
 * 
 * This file demonstrates various ways to use the VersionHistory component.
 * Copy and adapt these examples for your specific use case.
 */

import { useState } from "react";
import { VersionHistory } from "./version-history";
import { VersionComparison } from "./version-comparison";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// Example 1: Basic Usage
// ============================================================================

export function BasicVersionHistoryExample() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Financial Report</h2>
      
      {/* Display version history */}
      <VersionHistory reportId={123} />
    </div>
  );
}

// ============================================================================
// Example 2: With View Handler
// ============================================================================

export function VersionHistoryWithViewExample() {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Financial Report</h2>
      
      {/* Show selected version info */}
      {selectedVersion && (
        <Card>
          <CardHeader>
            <CardTitle>Viewing Version {selectedVersion}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is where you would display the specific version content.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setSelectedVersion(null)}
              className="mt-4"
            >
              Back to Current Version
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Version history with view handler */}
      <VersionHistory 
        reportId={123}
        onViewVersion={(version) => {
          console.log("Viewing version:", version);
          setSelectedVersion(version);
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 3: With Comparison Handler
// ============================================================================

export function VersionHistoryWithCompareExample() {
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const currentVersion = "1.2";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Financial Report</h2>
      
      {/* Show comparison if version selected */}
      {compareVersion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Version Comparison</h3>
            <Button 
              variant="outline" 
              onClick={() => setCompareVersion(null)}
            >
              Close Comparison
            </Button>
          </div>
          
          <VersionComparison 
            reportId={123}
            defaultVersion1={compareVersion}
            defaultVersion2={currentVersion}
          />
        </div>
      )}
      
      {/* Version history with compare handler */}
      <VersionHistory 
        reportId={123}
        onCompareVersion={(version) => {
          console.log("Comparing version:", version);
          setCompareVersion(version);
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 4: Full Integration with View and Compare
// ============================================================================

export function FullVersionHistoryExample() {
  const [mode, setMode] = useState<"current" | "view" | "compare">("current");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareVersion, setCompareVersion] = useState<string | null>(null);
  const currentVersion = "1.2";

  const handleViewVersion = (version: string) => {
    setSelectedVersion(version);
    setMode("view");
  };

  const handleCompareVersion = (version: string) => {
    setCompareVersion(version);
    setMode("compare");
  };

  const handleBackToCurrent = () => {
    setMode("current");
    setSelectedVersion(null);
    setCompareVersion(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Financial Report</h2>
        {mode !== "current" && (
          <Button variant="outline" onClick={handleBackToCurrent}>
            Back to Current Version
          </Button>
        )}
      </div>

      {/* Content based on mode */}
      {mode === "current" && (
        <Card>
          <CardHeader>
            <CardTitle>Current Report (Version {currentVersion})</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is the current version of the report.
            </p>
          </CardContent>
        </Card>
      )}

      {mode === "view" && selectedVersion && (
        <Card>
          <CardHeader>
            <CardTitle>Report Version {selectedVersion}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is version {selectedVersion} of the report.
            </p>
          </CardContent>
        </Card>
      )}

      {mode === "compare" && compareVersion && (
        <VersionComparison 
          reportId={123}
          defaultVersion1={compareVersion}
          defaultVersion2={currentVersion}
        />
      )}

      {/* Version History */}
      <VersionHistory 
        reportId={123}
        onViewVersion={handleViewVersion}
        onCompareVersion={handleCompareVersion}
      />
    </div>
  );
}

// ============================================================================
// Example 5: Conditional Display (Only show if multiple versions exist)
// ============================================================================

export function ConditionalVersionHistoryExample() {
  const reportId = 123;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Financial Report</h2>
      
      {/* Main report content */}
      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Report data goes here...
          </p>
        </CardContent>
      </Card>
      
      {/* Only show version history if report has versions */}
      <VersionHistory reportId={reportId} />
    </div>
  );
}

// ============================================================================
// Example 6: With Custom Styling
// ============================================================================

export function StyledVersionHistoryExample() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-3xl font-bold">Financial Report Dashboard</h2>
        <p className="text-blue-100 mt-2">
          View and compare different versions of your report
        </p>
      </div>
      
      {/* Version history with custom container */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <VersionHistory reportId={123} />
      </div>
    </div>
  );
}

// ============================================================================
// Example 7: With Navigation Integration
// ============================================================================

export function VersionHistoryWithNavigationExample() {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const handleViewVersion = (version: string) => {
    setSelectedVersion(version);
    // In a real app, you might navigate to a different route
    // router.push(`/reports/123/versions/${version}`);
  };

  const handleCompareVersion = (version: string) => {
    // In a real app, you might navigate to a comparison page
    // router.push(`/reports/123/compare?v1=${version}&v2=current`);
    console.log("Navigate to comparison:", version);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Financial Report</h2>
      
      <VersionHistory 
        reportId={123}
        onViewVersion={handleViewVersion}
        onCompareVersion={handleCompareVersion}
      />
    </div>
  );
}
