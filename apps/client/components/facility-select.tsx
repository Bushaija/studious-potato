import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Facility } from '@/types/facility'

interface FacilitySelectProps {
  facilities: Array<{ id: number; name: string }>
  selectedFacility: string // This is the facility ID as string
  isLoading: boolean
  disabled: boolean
  onFacilityChange: (facilityId: string) => void
}

export function FacilitySelect({
  facilities,
  selectedFacility,
  isLoading,
  disabled,
  onFacilityChange
}: FacilitySelectProps) {
  return (
    <Select
      value={selectedFacility}
      onValueChange={onFacilityChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={
          isLoading 
            ? "Loading facilities..." 
            : disabled 
            ? "Select facility type first" 
            : "Select a facility"
        } />
      </SelectTrigger>
      <SelectContent>
        {facilities.map((facility) => (
          <SelectItem key={facility.id} value={String(facility.id)}>
            {facility.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}