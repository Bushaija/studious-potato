"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import useGetFacilities from "@/hooks/queries/facilities/use-get-facilities-filters"
import type { GetFacilitiesResponse } from "@/fetchers/planning/get-facilities-filter"
import { useUser } from "@/components/providers/session-provider"

interface Program {
  id: string
  name: string
}

interface Facility {
  id: string
  name: string
  type: string
  program?: string
}

interface FacilityType {
  id: string
  label: string
}

interface FacilityFilterDialogProps {
  programs: Program[]
  facilities: Facility[]
  getFacilityTypes: (program?: string) => FacilityType[]
  onCreatePlan: (args: {
    facilityId: string
    facilityType: string
    projectId?: string
    program?: string
    facilityName?: string
    reportingPeriodId?: string
  }) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isAvailableForPlanning?: (facilityName: string, program: string) => boolean
}

export function FacilityFilterDialog({
  programs,
  facilities,
  getFacilityTypes,
  onCreatePlan,
  open,
  onOpenChange,
  isAvailableForPlanning,
}: FacilityFilterDialogProps) {
  const user = useUser()
  const [selectedProgram, setSelectedProgram] = useState("")
  const [selectedFacility, setSelectedFacility] = useState("")
  const [selectedType, setSelectedType] = useState("")
  // Derive facilityId once from session context to avoid effect-driven loops
  const facilityIdFromSession = useMemo(() => {
    const val = (user?.facilityId as unknown) as number | string | undefined
    return val !== undefined && val !== null ? String(val) : undefined
  }, [user?.facilityId])
  const districtIdFromSession = useMemo(() => {
    const val = (user?.districtId as unknown) as number | string | undefined
    return val !== undefined && val !== null ? String(val) : undefined
  }, [user?.districtId])
  // Get facility types based on selected program
  const availableFacilityTypes = getFacilityTypes(selectedProgram);
  
  // Map selected program id to API enum value (e.g., HIV, Malaria)
  const selectedProgramEnum = useMemo(() => {
    const found = programs.find((p) => p.id === selectedProgram)
    return found?.name ?? ""
  }, [programs, selectedProgram])

  // Fetch facilities from planning configuration when both required params are present
  const { data: planningConfig, isLoading: isConfigLoading } = useGetFacilities(
    selectedProgramEnum && selectedType
    ? {
      // Casting to expected literal unions from API types
      // Values are controlled via selects
      program: selectedProgramEnum as any,
      facilityType: selectedType as any,
      // facilityId: facilityIdFromSession,
      districtId: districtIdFromSession
    }
    : ({} as any)
  )

  console.log("planningConfig", planningConfig)


  // Prefer facilities from planning configuration; fallback to provided list
  const serverFacilities = useMemo<Facility[]>(() => {
    type FacilityItem = GetFacilitiesResponse["data"]["facilities"][number]
    const items = (planningConfig?.data?.facilities ?? []) as GetFacilitiesResponse["data"]["facilities"]
    return items.map((f: FacilityItem): Facility => ({ id: String(f.id), name: f.name, type: String(f.facilityType) }))
  }, [planningConfig])

  // Filter facilities based on selected type and program availability
  const filteredFacilities = useMemo(() => {
    const source = serverFacilities.length > 0 ? serverFacilities : facilities
    const base = selectedType ? source.filter((f) => f.type === selectedType) : source

    if (selectedProgram && isAvailableForPlanning) {
      return base.filter((f) => isAvailableForPlanning(f.name, selectedProgramEnum))
    }
    return base
  }, [facilities, serverFacilities, selectedType, selectedProgram, selectedProgramEnum, isAvailableForPlanning])

  const handleCreate = () => {
    if (!selectedFacility || !selectedType || !selectedProgram) return
    const source = serverFacilities.length > 0 ? serverFacilities : facilities
    const facilityObj = source.find((f) => f.id === selectedFacility)
    const facilityName = facilityObj?.name

    onCreatePlan({
      facilityId: selectedFacility,
      facilityType: selectedType,
      projectId: selectedProgram,
      program: selectedProgramEnum,
      facilityName,
      // reportingPeriodId: could be added when selection is available
    })
    setSelectedFacility("")
    setSelectedType("")
    setSelectedProgram("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="h-24 w-32 border-[1.5px] hover:border-primary/80 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 rounded-sm"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <span className="text-xs font-medium">New Plan</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-md">Create New Plan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type" className="text-sm font-medium">Program</Label>
            <Select
              value={selectedProgram}
              onValueChange={(value: string) => {
                setSelectedProgram(value)
                setSelectedFacility("")
                // Reset facility type if the new program doesn't support it
                const newFacilityTypes = getFacilityTypes(value);
                if (!newFacilityTypes.find(type => type.id === selectedType)) {
                  setSelectedType("");
                }
              }}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type" className="text-sm font-medium">Health Facility Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value: string) => {
                setSelectedType(value)
                setSelectedFacility("")
              }}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select facility type" />
              </SelectTrigger>
              <SelectContent>
                {availableFacilityTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="facility" className="text-sm font-medium">Health Facility Name</Label>
            <Select
              value={selectedFacility}
              onValueChange={setSelectedFacility}
              disabled={!selectedType || isConfigLoading}
            >
              <SelectTrigger id="facility" className="w-full">
                <SelectValue className="text-sm" placeholder={isConfigLoading ? "Loading facilities..." : "Select health facility"} />
              </SelectTrigger>
              <SelectContent>
                {filteredFacilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!selectedFacility || !selectedType}
            className="w-full mt-4 text-xs font-medium"
          >
            Create Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 