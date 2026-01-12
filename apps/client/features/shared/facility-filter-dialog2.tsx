"use client"

import React, { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useGetPlanningFacilities } from "@/hooks/queries/facilities/use-get-planning-facilities";
import { useGetExecutionFacilities } from "@/hooks/queries/facilities/use-get-execution-facilities";
import { FacilityFilterForm } from "@/components/facility-form"
import { usePermissions } from "@/components/providers/session-provider"
import { getCurrentQuarterForExecution } from "@/features/execution/utils/quarter-management"
import { NewPlanTrigger } from "@/components/facilities-filter-dialog-trigger"
import type { Program, FacilityType, CreatePlanArgs, CreateExecutionArgs } from '@/types/facility'
import { useGetCurrentReportingPeriod, useGetReportingPeriods } from "@/hooks/queries"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface FacilityFilterDialogProps {
  programs: Program[]
  getFacilityTypes: (program?: string) => FacilityType[]
  onCreate: (args: CreatePlanArgs | CreateExecutionArgs) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  label?: string
  facilityId: number | undefined // ✅ Required facilityId (user's hospital)
  mode?: "planning" | "execution"
}

export const FacilityFilterDialog: React.FC<FacilityFilterDialogProps> = ({
  label,
  programs,
  getFacilityTypes,
  onCreate,
  open,
  onOpenChange,
  facilityId, // ✅ Receive facilityId (user's hospital)
  mode = "planning",
}) => {
  // Get user permissions
  const { hasPermission } = usePermissions()
  const canChangeQuarter = hasPermission('all_quarters')
  const canAccessPreviousFiscalYear = hasPermission('access_previous_fiscal_year_data')

  // Get current quarter for users without permission
  const currentQuarter = getCurrentQuarterForExecution()

  // Fiscal year switcher state
  const [showPreviousFiscalYear, setShowPreviousFiscalYear] = React.useState(false)

  // Fetch current and all reporting periods
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod()
  const { data: allReportingPeriods } = useGetReportingPeriods()

  // Determine which reporting period to use
  const selectedReportingPeriodId = useMemo(() => {
    if (!showPreviousFiscalYear) {
      return currentReportingPeriod?.id
    }

    // Find previous fiscal year (year before current)
    const periodsData = (allReportingPeriods as any)?.data || allReportingPeriods
    const periods = Array.isArray(periodsData) ? periodsData : []
    const currentYear = currentReportingPeriod?.year

    if (currentYear && periods.length > 0) {
      const previousPeriod = periods.find((p: any) => p.year === currentYear - 1)
      return previousPeriod?.id
    }

    return currentReportingPeriod?.id
  }, [showPreviousFiscalYear, currentReportingPeriod, allReportingPeriods])

  // Local state for filter selections
  const [selectedProgram, setSelectedProgram] = React.useState<string>("")
  const [selectedFacilityType, setSelectedFacilityType] = React.useState<string>("")
  const [selectedFacility, setSelectedFacility] = React.useState<{
    id: number
    name: string
  } | null>(null)
  const [selectedQuarter, setSelectedQuarter] = React.useState<string>(canChangeQuarter ? "Q1" : currentQuarter)

  // Determine mode
  const isExecutionMode = mode === "execution" || label?.toLowerCase().includes("execution")
  const actualMode = isExecutionMode ? "execution" : "planning"

  // Get available facility types based on selected program
  const availableFacilityTypes = useMemo(() => {
    return getFacilityTypes(selectedProgram)
  }, [selectedProgram, getFacilityTypes])

  // Map selected program ID to program name for API
  const selectedProgramName = useMemo(() => {
    const program = programs.find(p => p.id === selectedProgram)
    return program?.name || ""
  }, [programs, selectedProgram])


  const { data: planningData, isLoading: planningIsLoading, error: planningError } = useGetPlanningFacilities({
    program: selectedProgramName,
    facilityType: selectedFacilityType,
    facilityId: facilityId ?? "",
    reportingPeriodId: selectedReportingPeriodId,
  })

  const { data: executionData, isLoading: executionIsLoading, error: executionError } = useGetExecutionFacilities({
    program: selectedProgramName,
    facilityType: selectedFacilityType,
    facilityId: facilityId ?? "",
    reportingPeriodId: selectedReportingPeriodId,
    quarter: selectedQuarter as "Q1" | "Q2" | "Q3" | "Q4",
  })

  // Convert API response to facility list format (switch by mode)
  const filteredFacilities = useMemo(() => {
    return isExecutionMode
      ? (executionData?.availableFacilities || [])
      : (planningData?.availableFacilities || [])
  }, [isExecutionMode, executionData, planningData])

  // Validation: all fields must be selected
  const isValid = Boolean(
    selectedProgram &&
    selectedFacilityType &&
    selectedFacility?.id &&
    selectedFacility?.name
  )

  // Handlers
  const handleProgramChange = (program: string) => {
    setSelectedProgram(program)
    setSelectedFacilityType("")
    setSelectedFacility(null)
  }

  const handleFacilityTypeChange = (facilityType: string) => {
    setSelectedFacilityType(facilityType)
    setSelectedFacility(null)
  }

  const handleFacilityChange = (facility: { id: number; name: string }) => {
    setSelectedFacility(facility)
  }

  const handleQuarterChange = (quarter: string) => {
    // Only allow quarter changes if user has permission
    if (canChangeQuarter) {
      setSelectedQuarter(quarter)
      // Reset facility selection when quarter changes since available facilities might change
      setSelectedFacility(null)
    }
  }

  const resetFilter = () => {
    setSelectedProgram("")
    setSelectedFacilityType("")
    setSelectedFacility(null)
    setSelectedQuarter(canChangeQuarter ? "Q1" : currentQuarter)
    setShowPreviousFiscalYear(false)
  }

  const handleCreate = () => {
    if (!isValid || !selectedFacility) return

    // Find the selected program to get its projectType (program name)
    const selectedProgramObj = programs.find(p => p.id === selectedProgram)
    const projectType = selectedProgramObj?.name || ""

    if (isExecutionMode) {
      const args: CreateExecutionArgs = {
        program: selectedProgram,
        facilityType: selectedFacilityType,
        facilityId: String(selectedFacility.id),
        facilityName: selectedFacility.name,
        projectId: projectType,
        quarter: selectedQuarter,
        reportingPeriodId: selectedReportingPeriodId, // ✅ Include selected reporting period
      }
      onCreate(args)
    } else {
      const args: CreatePlanArgs = {
        program: selectedProgram,
        facilityType: selectedFacilityType,
        facilityId: String(selectedFacility.id),
        facilityName: selectedFacility.name,
        projectId: projectType,
        reportingPeriodId: selectedReportingPeriodId, // ✅ Include selected reporting period
      }
      onCreate(args)
    }
    resetFilter()
    onOpenChange?.(false)
  }

  // Build filter state for the form component
  const filterState = {
    program: selectedProgram,
    facilityType: selectedFacilityType,
    facility: selectedFacility,
    quarter: selectedQuarter,
  }

  const currentFiscalYear = currentReportingPeriod?.year
  const previousFiscalYear = currentFiscalYear ? currentFiscalYear - 1 : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <NewPlanTrigger label={label} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-md flex items-center justify-between">
            <span>
              {isExecutionMode ? "Create New Execution" : "Create New Plan"}
              {showPreviousFiscalYear && previousFiscalYear && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (FY {previousFiscalYear})
                </span>
              )}
              {!showPreviousFiscalYear && currentFiscalYear && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (FY {currentFiscalYear})
                </span>
              )}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Fiscal Year Switcher - Only show if user has permission */}
        {canAccessPreviousFiscalYear && (
          <div className="flex items-center justify-between py-2 px-1 bg-muted/50 rounded-md">
            <Label htmlFor="fiscal-year-dialog-toggle" className="text-sm cursor-pointer">
              {previousFiscalYear ?
                `${isExecutionMode ? 'Execute' : 'Plan'} for FY ${previousFiscalYear}` :
                'Previous Fiscal Year'
              }
            </Label>
            <Switch
              id="fiscal-year-dialog-toggle"
              checked={showPreviousFiscalYear}
              onCheckedChange={(checked) => {
                setShowPreviousFiscalYear(checked)
                // Reset facility selection when fiscal year changes
                setSelectedFacility(null)
              }}
              disabled={!previousFiscalYear}
            />
          </div>
        )}

        <FacilityFilterForm
          programs={programs}
          availableFacilityTypes={availableFacilityTypes}
          filteredFacilities={filteredFacilities}
          filterState={filterState}
          isLoadingFacilities={isExecutionMode ? executionIsLoading : planningIsLoading}
          onProgramChange={handleProgramChange}
          onFacilityTypeChange={handleFacilityTypeChange}
          onFacilityChange={handleFacilityChange}
          onQuarterChange={handleQuarterChange}
          mode={actualMode}
          showQuarterTabs={isExecutionMode}
        />

        {(isExecutionMode ? executionError : planningError) && (
          <div className="text-sm text-destructive mt-2">
            Error loading facilities: {(isExecutionMode ? executionError : planningError)!.message}
          </div>
        )}

        {/* {((isExecutionMode ? executionData : planningData)) && ((isExecutionMode ? executionData : planningData)!.count === 0) && selectedProgram && selectedFacilityType && (
          <div className="text-sm text-muted-foreground mt-2">
            {isExecutionMode
              ? "No facilities available for execution. Please create plans first."
              : "No facilities available for planning in your hospital."}
          </div>
        )} */}

        <Button
          onClick={handleCreate}
          disabled={!isValid || planningIsLoading || executionIsLoading}
          className="w-full mt-2 text-xs font-medium"
        >
          {isExecutionMode ? "Continue to Execution" : "Continue to Planning"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
