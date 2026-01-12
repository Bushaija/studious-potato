"use client"

import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { useGetProvinces } from '@/hooks/queries/provinces/use-get-provinces'
import { useGetDistricts } from '@/hooks/queries/districts/use-get-districts'

type Scope = 'district' | 'provincial' | 'country'

interface ScopeFiltersProps {
  scope: Scope
  onScopeChange: (scope: Scope) => void
  provinceId?: number
  onProvinceChange: (provinceId: number | undefined) => void
  districtId?: number
  onDistrictChange: (districtId: number | undefined) => void
  isAdmin: boolean
}

export function ScopeFilters({
  scope,
  onScopeChange,
  provinceId,
  onProvinceChange,
  districtId,
  onDistrictChange,
  isAdmin,
}: ScopeFiltersProps) {
  const { data: provincesData } = useGetProvinces()
  const { data: districtsData } = useGetDistricts({ provinceId })

  // Get selected names for breadcrumb
  const selectedProvince = provincesData?.find(p => p.id === provinceId)
  const selectedDistrict = districtsData?.find(d => d.id === districtId)

  // Handle scope change - reset dependent filters
  const handleScopeChange = (newScope: Scope) => {
    onScopeChange(newScope)
    
    // Reset filters based on new scope
    if (newScope === 'country') {
      onProvinceChange(undefined)
      onDistrictChange(undefined)
    } else if (newScope === 'provincial') {
      onDistrictChange(undefined)
    }
  }

  // Handle province change - reset district
  const handleProvinceChange = (newProvinceId: number | undefined) => {
    onProvinceChange(newProvinceId)
    onDistrictChange(undefined)
  }

  // Build breadcrumb
  const breadcrumb = []
  if (scope === 'country') {
    breadcrumb.push('National')
  } else if (scope === 'provincial' && selectedProvince) {
    breadcrumb.push(selectedProvince.name)
  } else if (scope === 'district') {
    if (selectedProvince) breadcrumb.push(selectedProvince.name)
    if (selectedDistrict) breadcrumb.push(selectedDistrict.name)
  }

  return (
    <div className="space-y-4">
      {/* Scope Selector - Only for Admin */}
      {isAdmin && (
        <div>
          <Label htmlFor="scope-select" className="text-sm font-medium mb-2 block">
            Report Scope
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleScopeChange('district')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scope === 'district'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              District
            </button>
            <button
              onClick={() => handleScopeChange('provincial')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scope === 'provincial'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Provincial
            </button>
            <button
              onClick={() => handleScopeChange('country')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                scope === 'country'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Country
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {scope === 'district' && 'View individual facilities in a district'}
            {scope === 'provincial' && 'View district summaries in a province'}
            {scope === 'country' && 'View provincial summaries nationwide'}
          </p>
        </div>
      )}

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">Viewing:</span>
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span>→</span>}
              <Badge variant="secondary">{item}</Badge>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Geographic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Province Filter - Show for district and provincial scopes */}
        {(scope === 'district' || scope === 'provincial') && (
          <div>
            <Label htmlFor="province-select" className="text-sm font-medium mb-2 block">
              Province {scope === 'provincial' && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={provinceId?.toString()}
              onValueChange={(value) => handleProvinceChange(value ? Number(value) : undefined)}
            >
              <SelectTrigger id="province-select" className="w-full">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provincesData && Array.isArray(provincesData) && provincesData.map((province: any) => (
                  <SelectItem key={province.id} value={province.id.toString()}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* District Filter - Show only for district scope */}
        {scope === 'district' && (
          <div>
            <Label htmlFor="district-select" className="text-sm font-medium mb-2 block">
              District {scope === 'district' && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={districtId?.toString()}
              onValueChange={(value) => onDistrictChange(value ? Number(value) : undefined)}
              disabled={!provinceId}
            >
              <SelectTrigger id="district-select" className="w-full">
                <SelectValue placeholder={provinceId ? "Select district" : "Select province first"} />
              </SelectTrigger>
              <SelectContent>
                {districtsData && Array.isArray(districtsData) && districtsData.map((district: any) => (
                  <SelectItem key={district.id} value={district.id.toString()}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Country Scope Message */}
        {scope === 'country' && (
          <div className="col-span-2">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>National View:</strong> Showing data aggregated by province across all of Rwanda
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Chips */}
      {(provinceId || districtId) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
          {provinceId && selectedProvince && (
            <Badge variant="outline" className="gap-1">
              Province: {selectedProvince.name}
              {scope === 'district' && (
                <button
                  onClick={() => handleProvinceChange(undefined)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          )}
          {districtId && selectedDistrict && (
            <Badge variant="outline" className="gap-1">
              District: {selectedDistrict.name}
              <button
                onClick={() => onDistrictChange(undefined)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
