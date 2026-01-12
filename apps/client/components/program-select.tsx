// import React from 'react'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import type { Program } from '@/types/facility'

// interface ProgramSelectProps {
//   programs: Program[]
//   selectedProgram: string
//   onProgramChange: (programId: string) => void
// }

// export const ProgramSelect: React.FC<ProgramSelectProps> = ({
//   programs,
//   selectedProgram,
//   onProgramChange,
// }) => {
//   return (
//     <Select value={selectedProgram} onValueChange={onProgramChange}>
//       <SelectTrigger id="program" className="w-full">
//         <SelectValue placeholder="Select program" />
//       </SelectTrigger>
//       <SelectContent>
//         {programs.map((program) => (
//           <SelectItem key={program.id} value={String(program.id)}>
//             {program.name}
//           </SelectItem>
//         ))}
//       </SelectContent>
//     </Select>
//   )
// }

// components/program-select.tsx

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Program } from '@/types/facility'

interface ProgramSelectProps {
  programs: Program[]
  selectedProgram: string
  onProgramChange: (programId: string) => void
}

export const ProgramSelect: React.FC<ProgramSelectProps> = ({
  programs,
  selectedProgram,
  onProgramChange,
}) => {
  return (
    <Select
      value={selectedProgram}
      onValueChange={onProgramChange}
    >
      <SelectTrigger id="program" className="w-full">
        <SelectValue 
          className="text-sm" 
          placeholder="Select program" 
        />
      </SelectTrigger>
      <SelectContent>
        {programs.map((program) => (
          <SelectItem key={program.id} value={program.id}>
            {program.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}