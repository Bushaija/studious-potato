/**
 * Example usage of PeriodLockManagement component
 * 
 * This file demonstrates various ways to use the Period Lock Management component
 * in different contexts and layouts.
 */

import React, { useState } from "react";
import { PeriodLockManagement } from "./period-lock-management";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================================
// Example 1: Basic Usage
// ============================================================================

export function BasicExample() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Period Lock Management</h1>
      <PeriodLockManagement facilityId={123} />
    </div>
  );
}

// ============================================================================
// Example 2: In Admin Dashboard with Tabs
// ============================================================================

export function AdminDashboardExample() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="locks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="locks">Period Locks</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="reports">Report Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="locks" className="space-y-4">
          <PeriodLockManagement facilityId={123} />
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {/* User management content */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Report Management</CardTitle>
              <CardDescription>Manage financial reports</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Report management content */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Example 3: With Facility Selector
// ============================================================================

export function WithFacilitySelectorExample() {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number>(123);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Period Lock Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage locked reporting periods and view audit trails
          </p>
        </div>
        
        {/* Facility Selector would go here */}
        <div className="w-64">
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(Number(e.target.value))}
            className="w-full p-2 border rounded"
          >
            <option value={123}>Health Center A</option>
            <option value={124}>Health Center B</option>
            <option value={125}>District Hospital</option>
          </select>
        </div>
      </div>

      <PeriodLockManagement facilityId={selectedFacilityId} />
    </div>
  );
}

// ============================================================================
// Example 4: In a Grid Layout with Other Admin Tools
// ============================================================================

export function GridLayoutExample() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">System Administration</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Period Locks */}
        <div className="lg:col-span-2">
          <PeriodLockManagement facilityId={123} />
        </div>
        
        {/* Sidebar - Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Locked Periods</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unlocked This Month</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Edit Attempts Blocked</p>
                <p className="text-2xl font-bold">47</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Period Unlocked</p>
                  <p className="text-muted-foreground">Q1 2025 - 2 hours ago</p>
                </div>
                <div>
                  <p className="font-medium">Edit Attempted</p>
                  <p className="text-muted-foreground">Q4 2024 - 5 hours ago</p>
                </div>
                <div>
                  <p className="font-medium">Period Locked</p>
                  <p className="text-muted-foreground">Q2 2025 - 1 day ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Standalone Page with Breadcrumbs
// ============================================================================

export function StandalonePageExample() {
  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <div className="border-b">
        <div className="container mx-auto py-3">
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            <a href="/dashboard" className="hover:text-foreground">Dashboard</a>
            <span>/</span>
            <a href="/admin" className="hover:text-foreground">Admin</a>
            <span>/</span>
            <span className="text-foreground">Period Locks</span>
          </nav>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Period Lock Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage locked reporting periods. Locked periods prevent back-dating of financial data
            to maintain the integrity of approved reports.
          </p>
        </div>
        
        <PeriodLockManagement facilityId={123} />
      </div>
    </div>
  );
}

// ============================================================================
// Example 6: With Loading State Handling
// ============================================================================

export function WithLoadingStateExample() {
  const [facilityId, setFacilityId] = useState<number | undefined>(undefined);
  const [isLoadingFacility, setIsLoadingFacility] = useState(true);

  // Simulate loading facility ID
  React.useEffect(() => {
    setTimeout(() => {
      setFacilityId(123);
      setIsLoadingFacility(false);
    }, 1000);
  }, []);

  if (isLoadingFacility) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Period Lock Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Loading facility information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!facilityId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Period Lock Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No facility selected. Please select a facility to view period locks.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PeriodLockManagement facilityId={facilityId} />
    </div>
  );
}

// ============================================================================
// Example 7: Multiple Facilities in Accordion
// ============================================================================

export function MultipleFacilitiesExample() {
  const facilities = [
    { id: 123, name: "Health Center A" },
    { id: 124, name: "Health Center B" },
    { id: 125, name: "District Hospital" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Period Locks - All Facilities</h1>
      
      {facilities.map((facility) => (
        <div key={facility.id}>
          <h2 className="text-xl font-semibold mb-4">{facility.name}</h2>
          <PeriodLockManagement facilityId={facility.id} />
        </div>
      ))}
    </div>
  );
}
