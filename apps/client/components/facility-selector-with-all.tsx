"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, AlertCircle, Building2, Home, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useGetAllFacilities } from "@/hooks/queries/facilities/use-get-all-facilities";
import type { FacilityWithDistrict } from "@/fetchers/facilities/get-all-facilities";

interface FacilitySelectorWithAllProps {
  value?: number | "all";
  onChange: (facilityId: number | "all") => void;
  disabled?: boolean;
  error?: string;
  aggregationLevel?: "FACILITY" | "DISTRICT" | "PROVINCE";
  /**
   * Optional list of facility IDs that have available data. When provided,
   * only these facilities will be displayed in the selector.
   * - undefined: Show all facilities (default behavior, data not yet loaded)
   * - empty array []: Show no individual facilities (only "All" option)
   * - array with IDs: Show only those facilities
   */
  facilityIdsWithData?: number[];
}

export function FacilitySelectorWithAll({
  value,
  onChange,
  disabled = false,
  error,
  aggregationLevel = "DISTRICT",
  facilityIdsWithData,
}: FacilitySelectorWithAllProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: facilities, isLoading, error: fetchError, refetch } = useGetAllFacilities();

  // Find the selected facility
  const selectedFacility = React.useMemo(() => {
    if (value === "all") return null;
    return facilities?.find((facility) => facility.id === value);
  }, [facilities, value]);

  // Filter facilities based on search query
  const filteredFacilities = React.useMemo(() => {
    if (!facilities) return [];

    // First, restrict to facilities that actually have data if the list is provided
    let baseList: FacilityWithDistrict[] = facilities;
    if (facilityIdsWithData !== undefined) {
      // Only filter if facilityIdsWithData is explicitly set (not undefined)
      // If it's an empty array, no facilities will be shown (which is correct - no data available)
      // If it has IDs, only those facilities will be shown
      const allowed = new Set<number>(facilityIdsWithData);
      baseList = baseList.filter((f) => allowed.has(f.id));
    }

    if (!searchQuery) return baseList;

    const query = searchQuery.toLowerCase();
    return baseList.filter(
      (facility) =>
        facility.name.toLowerCase().includes(query) ||
        facility.districtName.toLowerCase().includes(query)
    );
  }, [facilities, searchQuery, facilityIdsWithData]);

  // Clear search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Get facility type icon
  const getFacilityTypeIcon = (facilityType: "hospital" | "health_center") => {
    if (facilityType === "hospital") {
      return <Building2 className="h-3.5 w-3.5" />;
    }
    return <Home className="h-3.5 w-3.5" />;
  };

  // Get facility type badge with icon
  const getFacilityTypeBadge = (facilityType: "hospital" | "health_center") => {
    if (facilityType === "hospital") {
      return (
        <Badge 
          variant="outline" 
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1 shrink-0"
        >
          {getFacilityTypeIcon(facilityType)}
          <span className="hidden sm:inline">Hospital</span>
          <span className="sm:hidden">H</span>
        </Badge>
      );
    }
    return (
      <Badge 
        variant="outline" 
        className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 flex items-center gap-1 shrink-0"
      >
        {getFacilityTypeIcon(facilityType)}
        <span className="hidden sm:inline">HC</span>
        <span className="sm:hidden">HC</span>
      </Badge>
    );
  };

  // Get aggregation level label
  const getAggregationLabel = () => {
    switch (aggregationLevel) {
      case "FACILITY":
        return "Facility";
      case "DISTRICT":
        return "District";
      case "PROVINCE":
        return "Province";
      default:
        return "All";
    }
  };

  // Handle facility selection
  const handleSelect = (facilityId: number | "all") => {
    onChange(facilityId);
    setOpen(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <Button
        variant="outline"
        role="combobox"
        disabled
        className={cn(
          "w-full justify-between",
          error && "border-destructive"
        )}
        aria-label="Loading facilities"
      >
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading facilities...
        </span>
      </Button>
    );
  };

  // Error state
  if (fetchError) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between border-destructive text-destructive",
            error && "border-destructive"
          )}
          onClick={() => refetch()}
          aria-label="Failed to load facilities. Click to retry"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Failed to load facilities
          </span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="w-full"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Empty facilities list
  if (!facilities || facilities.length === 0) {
    return (
      <Button
        variant="outline"
        role="combobox"
        disabled
        className={cn(
          "w-full justify-between",
          error && "border-destructive"
        )}
        aria-label="No facilities available"
      >
        No facilities available
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={
              value === "all" 
                ? `All facilities - ${getAggregationLabel()} level` 
                : selectedFacility 
                  ? `Selected facility: ${selectedFacility.name}, ${selectedFacility.districtName}` 
                  : "Select facility"
            }
            aria-invalid={!!error}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-auto min-h-[2.5rem] py-2",
              !selectedFacility && value !== "all" && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            {value === "all" ? (
              <span className="flex items-center gap-2 truncate flex-1 min-w-0">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                  <span className="truncate font-medium text-sm">
                    All Facilities
                  </span>
                  <span className="text-muted-foreground text-xs truncate">
                    {getAggregationLabel()} level aggregation
                  </span>
                </span>
              </span>
            ) : selectedFacility ? (
              <span className="flex items-center gap-2 truncate flex-1 min-w-0">
                <span className="hidden sm:inline shrink-0">
                  {getFacilityTypeIcon(selectedFacility.facilityType)}
                </span>
                <span className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                  <span className="truncate font-medium text-sm">
                    {selectedFacility.name}
                  </span>
                  <span className="text-muted-foreground text-xs truncate">
                    {selectedFacility.districtName}
                  </span>
                </span>
              </span>
            ) : (
              "Select facility"
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full sm:w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search facilities..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              aria-label="Search facilities by name or district"
              className="h-10"
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No facilities found
              </CommandEmpty>
              <CommandGroup>
                {/* All Facilities Option */}
                <CommandItem
                  value="all"
                  onSelect={() => handleSelect("all")}
                  className="flex items-start justify-between gap-3 py-3 px-3 cursor-pointer border-b"
                  aria-label={`All facilities - ${getAggregationLabel()} level aggregation`}
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Check
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        value === "all" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="font-medium text-sm truncate leading-tight flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        All Facilities
                      </span>
                      <span className="text-muted-foreground text-xs truncate leading-tight">
                        {getAggregationLabel()} level aggregation
                      </span>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 shrink-0 mt-0.5"
                  >
                    {getAggregationLabel()}
                  </Badge>
                </CommandItem>

                {/* Individual Facilities */}
                {filteredFacilities.map((facility) => (
                  <CommandItem
                    key={facility.id}
                    value={String(facility.id)}
                    onSelect={() => handleSelect(facility.id)}
                    className="flex items-start justify-between gap-3 py-3 px-3 cursor-pointer"
                    aria-label={`${facility.name}, ${facility.districtName}, ${facility.facilityType === "hospital" ? "Hospital" : "Health Center"}`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          value === facility.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="font-medium text-sm truncate leading-tight">
                          {facility.name}
                        </span>
                        <span className="text-muted-foreground text-xs truncate leading-tight">
                          District: {facility.districtName}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {getFacilityTypeBadge(facility.facilityType)}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
