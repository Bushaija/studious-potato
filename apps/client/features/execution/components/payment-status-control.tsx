"use client"

import * as React from "react"
import { Check, X, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type PaymentStatus = "paid" | "unpaid" | "partial"

export interface PaymentStatusControlProps {
  expenseCode: string
  amount: number
  paymentStatus: PaymentStatus
  amountPaid: number
  onChange: (status: PaymentStatus, amountPaid: number) => void
  disabled?: boolean
  // VAT-specific props (optional, only for VAT-applicable expenses)
  isVATApplicable?: boolean
  vatAmount?: number
  onVATAmountChange?: (vatAmount: number) => void
}

export function PaymentStatusControl({
  expenseCode,
  amount,
  paymentStatus,
  amountPaid,
  onChange,
  disabled = false,
  isVATApplicable = false,
  vatAmount = 0,
  onVATAmountChange,
}: PaymentStatusControlProps) {
  const [open, setOpen] = React.useState(false)
  const [partialAmount, setPartialAmount] = React.useState(amountPaid.toString())
  const [localVATAmount, setLocalVATAmount] = React.useState(vatAmount.toString())
  const [error, setError] = React.useState<string | null>(null)
  const [vatError, setVATError] = React.useState<string | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const fullyPaidButtonRef = React.useRef<HTMLButtonElement>(null)
  const unpaidButtonRef = React.useRef<HTMLButtonElement>(null)
  const partialInputRef = React.useRef<HTMLInputElement>(null)
  const vatInputRef = React.useRef<HTMLInputElement>(null)
  const applyButtonRef = React.useRef<HTMLButtonElement>(null)



  // Update partial amount when amountPaid changes externally
  React.useEffect(() => {
    setPartialAmount(amountPaid.toString())
  }, [amountPaid, expenseCode])

  // Update VAT amount when it changes externally
  React.useEffect(() => {
    setLocalVATAmount(vatAmount.toString())
  }, [vatAmount])

  // Focus management: focus first button when popover opens
  React.useEffect(() => {
    if (open) {
      if (fullyPaidButtonRef.current) {
        fullyPaidButtonRef.current.focus()
      }
    }
  }, [open])

  const handleFullyPaid = () => {
    onChange("paid", amount)
    setError(null)
    setOpen(false)
    // Return focus to trigger after closing
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const handleUnpaid = () => {
    onChange("unpaid", 0)
    setError(null)
    setOpen(false)
    // Return focus to trigger after closing
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const handlePartialPayment = () => {
    const parsedAmount = parseFloat(partialAmount)
    
    // Validation
    if (isNaN(parsedAmount)) {
      setError("Please enter a valid amount")
      return
    }
    
    if (parsedAmount <= 0) {
      setError("Paid amount must be greater than 0")
      return
    }
    
    if (parsedAmount > amount) {
      setError("Paid amount cannot exceed total expense")
      return
    }
    
    onChange("partial", parsedAmount)
    setError(null)
    setOpen(false)
    // Return focus to trigger after closing
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  // Keyboard navigation handler for popover content
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      setTimeout(() => triggerRef.current?.focus(), 0)
      return
    }

    // Arrow key navigation between buttons
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const focusableElements = [
        fullyPaidButtonRef.current,
        unpaidButtonRef.current,
        ...(isVATApplicable ? [vatInputRef.current] : []),
        partialInputRef.current,
        applyButtonRef.current,
      ].filter(Boolean) as HTMLElement[]

      const currentIndex = focusableElements.findIndex(
        (el) => el === document.activeElement
      )

      if (currentIndex === -1) {
        focusableElements[0]?.focus()
        return
      }

      if (e.key === "ArrowDown") {
        const nextIndex = (currentIndex + 1) % focusableElements.length
        focusableElements[nextIndex]?.focus()
      } else {
        const prevIndex =
          currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1
        focusableElements[prevIndex]?.focus()
      }
    }
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "paid":
        return <Check className="size-3 text-green-600" aria-hidden="true" />
      case "unpaid":
        return <X className="size-3 text-red-600" aria-hidden="true" />
      case "partial":
        return <Minus className="size-3 text-orange-600" aria-hidden="true" />
    }
  }

  const getStatusColor = () => {
    switch (paymentStatus) {
      case "paid":
        return "text-green-700 bg-green-100 hover:bg-green-200 border-green-300"
      case "unpaid":
        return "text-red-700 bg-red-100 hover:bg-red-200 border-red-300"
      case "partial":
        return "text-orange-700 bg-orange-100 hover:bg-orange-200 border-orange-300"
    }
  }

  const getStatusText = () => {
    switch (paymentStatus) {
      case "paid":
        return "Paid"
      case "unpaid":
        return "Unpaid"
      case "partial":
        return "Partial"
    }
  }

  const getStatusLabel = () => {
    switch (paymentStatus) {
      case "paid":
        return "Fully paid"
      case "unpaid":
        return "Not paid"
      case "partial":
        return `Partially paid: ${amountPaid} of ${amount}`
    }
  }

  const getStatusTooltip = () => {
    switch (paymentStatus) {
      case "paid":
        return `This expense is fully paid (${amount})`
      case "unpaid":
        return `This expense is not paid yet (${amount} outstanding)`
      case "partial":
        return `This expense is partially paid (${amountPaid} paid, ${amount - amountPaid} outstanding)`
    }
  }

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                  "cursor-pointer",
                  getStatusColor()
                )}
                aria-label={`Payment status for ${expenseCode}: ${getStatusLabel()}. Press Enter or Space to change payment status.`}
                aria-describedby={`${expenseCode}-payment-description`}
                aria-expanded={open}
                aria-haspopup="dialog"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setOpen(!open)
                  }
                }}
              >
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{getStatusTooltip()}</p>
          </TooltipContent>
        </Tooltip>
      
        <PopoverContent 
          className="w-80" 
          align="start"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-label="Payment status options"
        >
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm" id={`${expenseCode}-dialog-title`}>
                  Payment Status
                </h4>
                <p className="text-xs text-muted-foreground" id={`${expenseCode}-dialog-description`}>
                  Select how this expense has been paid. Use arrow keys to navigate options.
                </p>
              </div>

              <div className="space-y-2" role="group" aria-labelledby={`${expenseCode}-dialog-title`}>
                <Button
                  ref={fullyPaidButtonRef}
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleFullyPaid}
                  aria-label={`Mark as fully paid. Total amount: ${amount}`}
                >
                  <Check className="size-4 text-green-600" aria-hidden="true" />
                  Fully Paid
                </Button>

                <Button
                  ref={unpaidButtonRef}
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleUnpaid}
                  aria-label={`Mark as unpaid. Total amount: ${amount}`}
                >
                  <X className="size-4 text-red-600" aria-hidden="true" />
                  Unpaid
                </Button>

                {/* VAT Amount Input (only for VAT-applicable expenses) */}
                {isVATApplicable && (
                  <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/50 p-3">
                    <Label 
                      htmlFor={`vat-amount-${expenseCode}`} 
                      className="text-sm font-medium text-blue-900"
                    >
                      VAT Amount
                    </Label>
                    <Input
                      ref={vatInputRef}
                      id={`vat-amount-${expenseCode}`}
                      type="number"
                      placeholder="Enter VAT amount"
                      value={localVATAmount}
                      onChange={(e) => {
                        setLocalVATAmount(e.target.value)
                        setVATError(null)
                        // Update parent immediately
                        const parsed = parseFloat(e.target.value) || 0
                        if (parsed >= 0 && onVATAmountChange) {
                          onVATAmountChange(parsed)
                        }
                      }}
                      className={cn(vatError && "border-destructive")}
                      aria-invalid={!!vatError}
                      aria-describedby={vatError ? `${expenseCode}-vat-error ${expenseCode}-vat-hint` : `${expenseCode}-vat-hint`}
                      aria-label="Enter VAT amount that will be refunded by RRA"
                    />
                    
                    {vatError && (
                      <p
                        id={`${expenseCode}-vat-error`}
                        className="text-xs text-destructive"
                        role="alert"
                        aria-live="polite"
                      >
                        {vatError}
                      </p>
                    )}
                    
                    <p id={`${expenseCode}-vat-hint`} className="text-xs text-blue-700">
                      VAT amount that will be refunded by RRA
                    </p>
                  </div>
                )}

                {/* Total Invoice (only for VAT-applicable expenses) */}
                {isVATApplicable && (
                  <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                    <Label 
                      htmlFor={`total-invoice-${expenseCode}`} 
                      className="text-sm font-medium"
                    >
                      Total Invoice
                    </Label>
                    <Input
                      id={`total-invoice-${expenseCode}`}
                      type="number"
                      value={amount + (parseFloat(localVATAmount) || 0)}
                      disabled
                      className="bg-gray-100 cursor-not-allowed font-medium"
                      aria-label="Total invoice amount (Net + VAT). Auto-calculated."
                      aria-describedby={`${expenseCode}-total-invoice-hint`}
                    />
                    <p id={`${expenseCode}-total-invoice-hint`} className="text-xs text-muted-foreground">
                      Auto-calculated: Net Amount ({amount}) + VAT ({parseFloat(localVATAmount) || 0})
                    </p>
                  </div>
                )}

                <div className="space-y-2 rounded-md border p-3" role="group" aria-labelledby={`partial-label-${expenseCode}`}>
                  <div className="flex items-center gap-2">
                    <Minus className="size-4 text-orange-600" aria-hidden="true" />
                    <Label 
                      id={`partial-label-${expenseCode}`}
                      htmlFor={`partial-${expenseCode}`} 
                      className="text-sm font-medium"
                    >
                      Partially Paid
                    </Label>
                  </div>
                  
                  <div className="space-y-1">
                    <Input
                      ref={partialInputRef}
                      id={`partial-${expenseCode}`}
                      type="number"
                      placeholder="Enter paid amount"
                      value={partialAmount}
                      onChange={(e) => {
                        setPartialAmount(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handlePartialPayment()
                        }
                      }}
                      className={cn(error && "border-destructive")}
                      aria-invalid={!!error}
                      aria-describedby={error ? `${expenseCode}-error ${expenseCode}-total-hint` : `${expenseCode}-total-hint`}
                      aria-label={`Enter partial payment amount. Total expense is ${amount}`}
                    />
                    
                    {error && (
                      <p
                        id={`${expenseCode}-error`}
                        className="text-xs text-destructive"
                        role="alert"
                        aria-live="polite"
                      >
                        {error}
                      </p>
                    )}
                    
                    <p id={`${expenseCode}-total-hint`} className="text-xs text-muted-foreground">
                      Total expense: {amount}
                    </p>
                  </div>

                  <Button
                    ref={applyButtonRef}
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={handlePartialPayment}
                    aria-label="Apply partial payment amount"
                  >
                    Apply Partial Payment
                  </Button>
                </div>
              </div>
            </div>
        </PopoverContent>

        <span id={`${expenseCode}-payment-description`} className="sr-only">
          {getStatusLabel()}
        </span>
      </Popover>
    </TooltipProvider>
  )
}
