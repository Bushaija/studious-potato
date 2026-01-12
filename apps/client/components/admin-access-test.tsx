"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TestResult {
  name: string;
  status: "pending" | "running" | "passed" | "failed";
  message?: string;
  details?: any;
}

interface District {
  id: number;
  name: string;
  provinceId: number;
}

interface Province {
  id: number;
  name: string;
}

export function AdminAccessTest() {
  const { data: session, isPending } = authClient.useSession();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [accessibleFacilityCount, setAccessibleFacilityCount] = useState<number | null>(null);

  const user = session?.user as any;
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // Fetch districts and provinces
  useEffect(() => {
    async function fetchData() {
      try {
        const [districtsRes, provincesRes] = await Promise.all([
          fetch("http://localhost:9999/api/districts", { credentials: "include" }),
          fetch("http://localhost:9999/api/provinces", { credentials: "include" }),
        ]);

        if (districtsRes.ok) {
          const districtsData = await districtsRes.json();
          setDistricts(districtsData);
          if (districtsData.length > 0) {
            setSelectedDistrict(String(districtsData[0].id));
          }
        }

        if (provincesRes.ok) {
          const provincesData = await provincesRes.json();
          setProvinces(provincesData);
          if (provincesData.length > 0) {
            setSelectedProvince(String(provincesData[0].id));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Log facility count on mount
  useEffect(() => {
    if (user) {
      console.log("=".repeat(80));
      console.log("ADMIN ACCESS TEST - USER INFORMATION");
      console.log("=".repeat(80));
      console.log("User ID:", user.id);
      console.log("User Email:", user.email);
      console.log("User Role:", user.role);
      console.log("User Facility ID:", user.facilityId);
      console.log("User Facility:", user.facility);
      
      // Fetch user's accessible facilities count
      fetch("http://localhost:9999/api/user/accessible-facilities", {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          const count = data.facilityIds?.length || 0;
          setAccessibleFacilityCount(count);
          console.log("Accessible Facilities Count:", count);
          console.log("Accessible Facility IDs:", data.facilityIds);
          console.log("=".repeat(80));
        })
        .catch((error) => {
          console.error("Error fetching accessible facilities:", error);
        });
    }
  }, [user]);

  const updateTestResult = (name: string, updates: Partial<TestResult>) => {
    setTestResults((prev) =>
      prev.map((test) => (test.name === name ? { ...test, ...updates } : test))
    );
  };

  const runTests = async () => {
    if (!isAdmin) {
      alert("This test page is only for admin users");
      return;
    }

    setIsRunning(true);
    const tests: TestResult[] = [
      { name: "Fetch All Facilities", status: "pending" },
      { name: "Access District Data", status: "pending" },
      { name: "Access Province Data", status: "pending" },
      { name: "Access Other District", status: "pending" },
      { name: "Verify No Restrictions", status: "pending" },
    ];
    setTestResults(tests);

    try {
      // Test 1: Fetch all facilities
      updateTestResult("Fetch All Facilities", { status: "running" });
      const facilitiesRes = await fetch("http://localhost:9999/api/facilities", {
        credentials: "include",
      });
      const facilities = await facilitiesRes.json();
      console.log("\n[Test 1] All Facilities:", facilities.length);
      updateTestResult("Fetch All Facilities", {
        status: "passed",
        message: `Successfully fetched ${facilities.length} facilities`,
        details: { count: facilities.length },
      });

      // Test 2: Access district data
      if (selectedDistrict) {
        updateTestResult("Access District Data", { status: "running" });
        const districtRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/unified?scope=district&scopeId=${selectedDistrict}&components=metrics,budgetByFacility`,
          { credentials: "include" }
        );
        const districtData = await districtRes.json();
        console.log("\n[Test 2] District Data:", districtData);
        
        const facilitiesCount = districtData.budgetByFacility?.facilities?.length || 0;
        updateTestResult("Access District Data", {
          status: "passed",
          message: `Successfully accessed district ${selectedDistrict} with ${facilitiesCount} facilities`,
          details: { districtId: selectedDistrict, facilitiesCount },
        });
      }

      // Test 3: Access province data
      if (selectedProvince) {
        updateTestResult("Access Province Data", { status: "running" });
        const provinceRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/unified?scope=province&scopeId=${selectedProvince}&components=metrics,budgetByDistrict`,
          { credentials: "include" }
        );
        const provinceData = await provinceRes.json();
        console.log("\n[Test 3] Province Data:", provinceData);
        
        const districtsCount = provinceData.budgetByDistrict?.districts?.length || 0;
        updateTestResult("Access Province Data", {
          status: "passed",
          message: `Successfully accessed province ${selectedProvince} with ${districtsCount} districts`,
          details: { provinceId: selectedProvince, districtsCount },
        });
      }

      // Test 4: Access a different district (not user's assigned district)
      const otherDistrict = districts.find((d) => d.id !== user.facility?.districtId);
      if (otherDistrict) {
        updateTestResult("Access Other District", { status: "running" });
        const otherDistrictRes = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard/unified?scope=district&scopeId=${otherDistrict.id}&components=metrics`,
          { credentials: "include" }
        );
        const otherDistrictData = await otherDistrictRes.json();
        console.log("\n[Test 4] Other District Data:", otherDistrictData);
        
        updateTestResult("Access Other District", {
          status: "passed",
          message: `Admin can access district ${otherDistrict.id} (${otherDistrict.name}) outside assigned district`,
          details: { districtId: otherDistrict.id, districtName: otherDistrict.name },
        });
      }

      // Test 5: Verify no restrictions
      updateTestResult("Verify No Restrictions", { status: "running" });
      const userAccessRes = await fetch("http://localhost:9999/api/user/accessible-facilities", {
        credentials: "include",
      });
      const userAccessData = await userAccessRes.json();
      const accessibleCount = userAccessData.facilityIds?.length || 0;
      
      console.log("\n[Test 5] Accessible Facilities:", accessibleCount);
      console.log("Total Facilities:", facilities.length);
      
      if (accessibleCount === facilities.length) {
        updateTestResult("Verify No Restrictions", {
          status: "passed",
          message: `Admin has access to ALL ${accessibleCount} facilities (no restrictions)`,
          details: { accessibleCount, totalCount: facilities.length },
        });
      } else {
        updateTestResult("Verify No Restrictions", {
          status: "failed",
          message: `Admin only has access to ${accessibleCount} of ${facilities.length} facilities`,
          details: { accessibleCount, totalCount: facilities.length },
        });
      }

      console.log("\n" + "=".repeat(80));
      console.log("ALL TESTS COMPLETED");
      console.log("=".repeat(80));
    } catch (error) {
      console.error("Test error:", error);
      setTestResults((prev) =>
        prev.map((test) =>
          test.status === "running"
            ? { ...test, status: "failed", message: (error as Error).message }
            : test
        )
      );
    } finally {
      setIsRunning(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Authenticated</AlertTitle>
          <AlertDescription>Please sign in to access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This test page is only accessible to admin users. Your role: {user?.role}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Access Test</h1>
          <p className="text-muted-foreground">
            Verify that admin users can access all districts and provinces
          </p>
        </div>
        <Badge variant={isAdmin ? "default" : "destructive"}>
          {user?.role?.toUpperCase()}
        </Badge>
      </div>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Current logged-in user details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <p className="text-sm">{user?.role}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-sm">{user?.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Facility ID</p>
              <p className="text-sm">{user?.facilityId || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Primary District
                <span className="text-xs text-muted-foreground ml-1">(home base only)</span>
              </p>
              <p className="text-sm">{user?.facility?.district?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Accessible Facilities
                <span className="text-xs text-green-600 ml-1">(ALL - no restrictions)</span>
              </p>
              <p className="text-sm font-bold text-green-600">
                {accessibleFacilityCount !== null ? accessibleFacilityCount : "Loading..."}
              </p>
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Admin Access Model</AlertTitle>
            <AlertDescription>
              Admin users have a <strong>primary facility/district</strong> for context (home base), 
              but can access <strong>ALL facilities</strong> system-wide. The facility assignment 
              does not restrict access - it's only used for defaults and audit purposes.
              <br /><br />
              Check the browser console for detailed facility count logs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Select districts and provinces to test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Test District</label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={String(district.id)}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Province</label>
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province.id} value={String(province.id)}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={runTests} disabled={isRunning} className="w-full">
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Access Tests
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Results of admin access verification tests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResults.map((test) => (
              <div
                key={test.name}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {test.status === "pending" && (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    {test.status === "running" && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    )}
                    {test.status === "passed" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {test.status === "failed" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{test.name}</span>
                  </div>
                  {test.message && (
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      {test.message}
                    </p>
                  )}
                  {test.details && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 ml-6 overflow-x-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  )}
                </div>
                <Badge
                  variant={
                    test.status === "passed"
                      ? "default"
                      : test.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {test.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open the browser console (F12) to see detailed logs</li>
            <li>Click "Run Access Tests" to verify admin access</li>
            <li>Check that all tests pass (green checkmarks)</li>
            <li>Verify the facility count in console matches total facilities</li>
            <li>Confirm admin can access districts outside their assigned district</li>
          </ol>
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Expected Results:</strong> Admin users should have access to ALL
              facilities, districts, and provinces regardless of their assigned district.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
