import React from 'react'
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Lock } from "lucide-react"

import { ProgramSelect } from '@/components/program-select'
import { FacilityTypeSelect } from '@/components/facility-type-select'
import { FacilitySelect } from '@/components/facility-select'
import { usePermissions } from '@/components/providers/session-provider'
import { getCurrentQuarterForExecution } from '@/features/execution/utils/quarter-management'
import type { Program, FacilityType } from '@/types/facility'

// Updated types to match new structure
interface FacilityOption {
  id: number
  name: string
}

interface FacilityFilterState {
  program: string
  facilityType: string
  facility: { id: number; name: string } | null
  quarter?: string
}

interface FacilityFilterFormProps {
  programs: Program[]
  availableFacilityTypes: FacilityType[]
  filteredFacilities: FacilityOption[] // Changed from Facility[] to match API response
  filterState: FacilityFilterState
  isLoadingFacilities: boolean
  onProgramChange: (program: string) => void
  onFacilityTypeChange: (facilityType: string) => void
  onFacilityChange: (facility: { id: number; name: string }) => void // Updated signature
  onQuarterChange?: (quarter: string) => void
  mode?: 'planning' | 'execution'
  showQuarterTabs?: boolean
}

export const FacilityFilterForm: React.FC<FacilityFilterFormProps> = ({
  programs,
  availableFacilityTypes,
  filteredFacilities,
  filterState,
  isLoadingFacilities,
  onProgramChange,
  onFacilityTypeChange,
  onFacilityChange,
  onQuarterChange,
  mode = 'planning',
  showQuarterTabs = false,
}) => {
  // Get user permissions
  const { hasPermission } = usePermissions()
  
  // Check if user has permission to change quarters
  const canChangeQuarter = hasPermission('all_quarters')
  
  // Get current quarter as default
  const currentQuarter = getCurrentQuarterForExecution()
  
  // Use current quarter if user doesn't have permission or no quarter is selected
  const effectiveQuarter = canChangeQuarter ? (filterState.quarter || currentQuarter) : currentQuarter
  
  // Automatically set current quarter for users without permission
  React.useEffect(() => {
    if (!canChangeQuarter && onQuarterChange && filterState.quarter !== currentQuarter) {
      onQuarterChange(currentQuarter)
    }
  }, [canChangeQuarter, currentQuarter, onQuarterChange, filterState.quarter])
  
  // Show TB program restriction notice
  const showTBRestriction = filterState.program === 'TB'
  
  // Show no facilities available message
  const showNoFacilities = 
    filterState.program && 
    filterState.facilityType && 
    !isLoadingFacilities &&
    filteredFacilities.length === 0

  // Handler to convert facility selection to expected format
  const handleFacilitySelect = (facilityId: string) => {
    const selectedFacility = filteredFacilities.find(f => String(f.id) === facilityId)
    if (selectedFacility) {
      onFacilityChange({
        id: selectedFacility.id,
        name: selectedFacility.name
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="program" className="text-sm font-medium">
          Program *
        </Label>
        <ProgramSelect
          programs={programs}
          selectedProgram={filterState.program}
          onProgramChange={onProgramChange}
        />
      </div>

      {showTBRestriction && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            TB program services are only available at hospitals. Health centers have been filtered out.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="facility-type" className="text-sm font-medium">
          Health Facility Type *
        </Label>
        <FacilityTypeSelect
          facilityTypes={availableFacilityTypes}
          selectedType={filterState.facilityType}
          onTypeChange={onFacilityTypeChange}
          disabled={!filterState.program}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col items-start justify-between gap-2 w-full">
          <Label htmlFor="facility" className="text-sm font-medium">
            Health Facility Name *
          </Label>
          <FacilitySelect
            facilities={filteredFacilities}
            selectedFacility={filterState.facility?.id ? String(filterState.facility.id) : ''}
            isLoading={isLoadingFacilities}
            disabled={!filterState.facilityType}
            onFacilityChange={handleFacilitySelect}
          />
          {showQuarterTabs && (
            <div className="flex items-end w-full flex-col gap-6 mt-2">
              <div className={`relative ${!canChangeQuarter ? 'opacity-50' : ''}`}>
                <Tabs 
                  value={effectiveQuarter} 
                  onValueChange={canChangeQuarter ? onQuarterChange : undefined}
                  className="w-fit"
                >
                  <TabsList className={`grid w-full grid-cols-4 ${!canChangeQuarter ? 'pointer-events-none cursor-not-allowed' : ''}`}>
                    <TabsTrigger 
                      value="Q1" 
                      className={`text-xs ${!canChangeQuarter ? 'cursor-not-allowed' : ''}`}
                      disabled={!canChangeQuarter}
                    >
                      Q1
                    </TabsTrigger>
                    <TabsTrigger 
                      value="Q2" 
                      className={`text-xs ${!canChangeQuarter ? 'cursor-not-allowed' : ''}`}
                      disabled={!canChangeQuarter}
                    >
                      Q2
                    </TabsTrigger>
                    <TabsTrigger 
                      value="Q3" 
                      className={`text-xs ${!canChangeQuarter ? 'cursor-not-allowed' : ''}`}
                      disabled={!canChangeQuarter}
                    >
                      Q3
                    </TabsTrigger>
                    <TabsTrigger 
                      value="Q4" 
                      className={`text-xs ${!canChangeQuarter ? 'cursor-not-allowed' : ''}`}
                      disabled={!canChangeQuarter}
                    >
                      Q4
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Lock overlay for users without permission */}
                {!canChangeQuarter && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                          <Lock className="h-3 w-3" />
                          <span>Current Quarter Only</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          You are restricted to the current quarter ({currentQuarter}). Contact your administrator for access to other quarters.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        
        {showNoFacilities && (
          <p className="text-sm text-muted-foreground">
            {mode === 'execution'
              ? 'No facilities available for execution with the selected criteria. Only facilities that already have plans for the selected program are eligible.'
              : 'No facilities available for planning with the selected criteria. All facilities of this type may already have plans for the selected program.'}
          </p>
        )}
        
        {filteredFacilities.length > 0 && filterState.facilityType && !isLoadingFacilities && (
          <p className="text-sm text-muted-foreground">
            {filteredFacilities.length} facility(ies) available for {mode === 'execution' ? 'execution' : 'planning'}
          </p>
        )}
        
        {isLoadingFacilities && filterState.facilityType && (
          <p className="text-sm text-muted-foreground">
            Loading facilities...
          </p>
        )}
      </div>
    </div>
  )
}