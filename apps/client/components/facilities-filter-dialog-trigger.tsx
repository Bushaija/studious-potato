import React from 'react'
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface NewPlanTriggerProps {
  onClick?: () => void
  label?: string
}

export const NewPlanTrigger = React.forwardRef<
  HTMLButtonElement,
  NewPlanTriggerProps
>(({ onClick, label, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      onClick={onClick}
      className='bg-black text-white hover:text-black cursor-pointer hover:border-[1.5px] hover:border-black'
      {...props}
    >
        <Plus className="h-8 w-8 text-primary text-white cursor-pointer hover:border-2 hover:border-black" />
      <span className="text-xs font-medium">{label}</span>
    </Button>
    // <Button
    //   ref={ref}
    //   variant="outline"
    //   onClick={onClick}
    //   className="h-24 w-32 border-[1.5px] hover:border-primary/80 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 rounded-sm"
    //   {...props}
    // >
    //   <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
    //     <Plus className="h-8 w-8 text-primary" />
    //   </div>
    //   <span className="text-xs font-medium">New Plans</span>
    // </Button>
  )
})

NewPlanTrigger.displayName = "NewPlanTrigger"
