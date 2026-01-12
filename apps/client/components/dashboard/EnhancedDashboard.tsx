"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { DashboardTabs } from "./DashboardTabs";
import { DashboardRefreshControl } from "./DashboardRefreshControl";
import { useDashboardAccess } from "@/hooks/use-dashboard-access";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const ProvinceTabContainer = dynamic(() => import("./ProvinceTabContainer").then((mod) => ({ default: mod.ProvinceTabContainer })), {
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

const DistrictTabContainer = dynamic(() => import("./DistrictTabContainer").then((mod) => ({ default: mod.DistrictTabContainer })), {
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

function EnhancedDashboardComponent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get access rights based on user role
  const {
    accessRights,
    defaultTab,
    defaultDistrictId,
    defaultProvinceId,
    user,
    isLoading: isLoadingAccess,
  } = useDashboardAccess();

  // Get initial values from URL
  const urlTab = searchParams.get("tab") as "province" | "district" | null;
  const urlProvinceId = searchParams.get("provinceId");
  const urlDistrictId = searchParams.get("districtId");
  const urlProjectType = searchParams.get("projectType");
  const urlQuarter = searchParams.get("quarter");

  // State
  const [activeTab, setActiveTab] = useState<"province" | "district">("district");
  const [provinceId, setProvinceId] = useState<string | undefined>(undefined);
  const [districtId, setDistrictId] = useState<string | undefined>(undefined);
  const [projectType, setProjectType] = useState<string | undefined>(urlProjectType || undefined);
  const [quarter, setQuarter] = useState<string | undefined>(urlQuarter || undefined);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state once access rights are loaded
  useEffect(() => {
    if (!isLoadingAccess && !isInitialized) {
      console.log("[EnhancedDashboard] Initializing state", {
        defaultTab,
        defaultDistrictId,
        defaultProvinceId,
        accessRights,
        urlTab,
        urlDistrictId,
        urlProvinceId,
      });

      // Set active tab
      let initialTab: "province" | "district" = defaultTab;
      if (urlTab) {
        if (urlTab === "province" && accessRights.canViewProvinceTab) {
          initialTab = "province";
        } else if (urlTab === "district" && accessRights.canViewDistrictTab) {
          initialTab = "district";
        }
      }
      setActiveTab(initialTab);

      // Set province ID
      if (accessRights.canFilterByAnyProvince) {
        setProvinceId(urlProvinceId || undefined);
      } else if (defaultProvinceId) {
        setProvinceId(String(defaultProvinceId));
      }

      // Set district ID
      if (accessRights.canFilterByAnyDistrict) {
        setDistrictId(urlDistrictId || undefined);
      } else if (defaultDistrictId) {
        setDistrictId(String(defaultDistrictId));
      }

      console.log("[EnhancedDashboard] State initialized", {
        initialTab,
        provinceId: accessRights.canFilterByAnyProvince ? (urlProvinceId || undefined) : (defaultProvinceId ? String(defaultProvinceId) : undefined),
        districtId: accessRights.canFilterByAnyDistrict ? (urlDistrictId || undefined) : (defaultDistrictId ? String(defaultDistrictId) : undefined),
      });

      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingAccess, isInitialized]);

  // Update URL when state changes (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (provinceId) params.set("provinceId", provinceId);
    if (districtId) params.set("districtId", districtId);
    if (projectType) params.set("projectType", projectType);
    if (quarter) params.set("quarter", quarter);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [isInitialized, activeTab, provinceId, districtId, projectType, quarter, router, pathname]);

  const handleTabChange = useCallback((tab: "province" | "district") => {
    // Validate tab access before changing
    if (tab === "province" && !accessRights.canViewProvinceTab) {
      return;
    }
    if (tab === "district" && !accessRights.canViewDistrictTab) {
      return;
    }
    setActiveTab(tab);
  }, [accessRights.canViewProvinceTab, accessRights.canViewDistrictTab]);

  const handleProvinceChange = useCallback((value: string) => {
    setProvinceId(value);
  }, []);

  const handleDistrictChange = useCallback((value: string) => {
    setDistrictId(value);
  }, []);

  const handleProjectTypeChange = useCallback((value: string) => {
    setProjectType(value);
  }, []);

  const handleQuarterChange = useCallback((value: string) => {
    setQuarter(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    if (activeTab === "province") {
      setProvinceId(undefined);
    } else {
      setDistrictId(undefined);
    }
    setProjectType(undefined);
    setQuarter(undefined);
  }, [activeTab]);

  const handleDistrictClick = useCallback((clickedDistrictId: number) => {
    // Only allow if user can view district tab and change districts
    if (!accessRights.canViewDistrictTab || !accessRights.canFilterByAnyDistrict) {
      return;
    }
    setActiveTab("district");
    setDistrictId(String(clickedDistrictId));
  }, [accessRights.canViewDistrictTab, accessRights.canFilterByAnyDistrict]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setLastUpdated(new Date());

    // Reset refreshing state after a short delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const handleDataLoaded = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  // Show loading state while checking access or initializing
  if (isLoadingAccess || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error if user has no access to any tab
  if (!accessRights.canViewProvinceTab && !accessRights.canViewDistrictTab) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor budget allocation, execution, and approval status
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access the dashboard. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {accessRights.canViewProvinceTab
              ? "Monitor budget allocation, execution, and approval status across provinces and districts"
              : "Monitor budget allocation, execution, and approval status for your district"}
          </p>
        </div>
        <DashboardRefreshControl
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Tabs - Only show if user has access to both tabs */}
      {accessRights.canViewProvinceTab && accessRights.canViewDistrictTab && (
        <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      {/* Tab Content */}
      {activeTab === "province" && accessRights.canViewProvinceTab ? (
        <ProvinceTabContainer
          key={`province-${refreshTrigger}`}
          provinceId={provinceId}
          projectType={projectType}
          quarter={quarter}
          onProvinceChange={handleProvinceChange}
          onProjectTypeChange={handleProjectTypeChange}
          onQuarterChange={handleQuarterChange}
          onClearFilters={handleClearFilters}
          onDistrictClick={handleDistrictClick}
          onDataLoaded={handleDataLoaded}
          accessRights={accessRights}
        />
      ) : accessRights.canViewDistrictTab ? (
        <DistrictTabContainer
          key={`district-${refreshTrigger}`}
          districtId={districtId}
          provinceId={provinceId}
          projectType={projectType}
          quarter={quarter}
          onDistrictChange={handleDistrictChange}
          onProjectTypeChange={handleProjectTypeChange}
          onQuarterChange={handleQuarterChange}
          onClearFilters={handleClearFilters}
          onDataLoaded={handleDataLoaded}
          accessRights={accessRights}
        />
      ) : null}
    </div>
  );
}

export const EnhancedDashboard = memo(EnhancedDashboardComponent);
