// import React from 'react'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import type { FacilityType } from '@/types/facility'

// interface FacilityTypeSelectProps {
//   facilityTypes: FacilityType[]
//   selectedType: string
//   onTypeChange: (typeId: string) => void
// }

// export const FacilityTypeSelect: React.FC<FacilityTypeSelectProps> = ({
//   facilityTypes,
//   selectedType,
//   onTypeChange,
// }) => {
//   return (
//     <Select value={selectedType} onValueChange={onTypeChange}>
//       <SelectTrigger id="facility-type" className="w-full">
//         <SelectValue placeholder="Select facility type" />
//       </SelectTrigger>
//       <SelectContent>
//         {facilityTypes.map((type) => (
//           <SelectItem key={type.id} value={type.id}>
//             {type.label}
//           </SelectItem>
//         ))}
//       </SelectContent>
//     </Select>
//   )
// }

// components/facility-type-select.tsx

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FacilityType } from '@/types/facility'

interface FacilityTypeSelectProps {
  facilityTypes: FacilityType[]
  selectedType: string
  disabled?: boolean
  onTypeChange: (typeId: string) => void
}

export const FacilityTypeSelect: React.FC<FacilityTypeSelectProps> = ({
  facilityTypes,
  selectedType,
  disabled = false,
  onTypeChange,
}) => {
  const getPlaceholderText = () => {
    if (disabled) return "Select program first"
    return "Select facility type"
  }

  return (
    <Select
      value={selectedType}
      onValueChange={onTypeChange}
      disabled={disabled}
    >
      <SelectTrigger id="facility-type" className="w-full">
        <SelectValue 
          className="text-sm" 
          placeholder={getPlaceholderText()} 
        />
      </SelectTrigger>
      <SelectContent>
        {facilityTypes.map((type) => (
          <SelectItem key={type.id} value={type.id}>
            {type.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}