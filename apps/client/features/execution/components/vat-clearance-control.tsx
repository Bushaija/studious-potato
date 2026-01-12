"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { VATApplicableCategory } from "../utils/vat-applicable-expenses"
import { CheckCircle2, Clock } from "lucide-react"

export interface VATClearanceControlProps {
  vatCategory: VATApplicableCategory
  categoryLabel: string
  receivableBalance: number
  clearedAmount: number
  onClearVAT: (amount: number) => void
  disabled?: boolean
  readOnly?: boolean
}

export function VATClearanceControl({
  vatCategory,
  categoryLabel,
  receivableBalance,
  clearedAmount,
  onClearVAT,
  disabled = false,
  readOnly = false,
}: VATClearanceControlProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [clearAmount, setClearAmount] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  const isFullyCleared = receivableBalance === 0
  const hasPendingBalance = receivableBalance > 0

  // Reset state when popover closes
  React.useEffect(() => {
    if (!isOpen) {
      setClearAmount("")
      setError(null)
    }
  }, [isOpen])

  const handleAmountChange = (value: string) => {
    setClearAmount(value)
    setError(null)

    // Validate as user types
    const amount = parseFloat(value)
    if (value && isNaN(amount)) {
      setError("Please enter a valid number")
    } else if (amount <= 0) {
      setError("Amount must be greater than 0")
    } else if (amount > receivableBalance) {
      setError(`Amount cannot exceed balance (${receivableBalance.toLocaleString()} RWF)`)
    }
  }

  const handleClear = () => {
    const amount = parseFloat(clearAmount)

    // Validation
    if (!clearAmount || isNaN(amount)) {
      setError("Please enter a valid amount")
      return
    }

    if (amount <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    if (amount > receivableBalance) {
      setError(`Amount cannot exceed receivable balance (${receivableBalance.toLocaleString()} RWF)`)
      return
    }

    // Clear the VAT
    onClearVAT(amount)
    setIsOpen(false)
    setClearAmount("")
    setError(null)
  }

  const handleClearFullAmount = () => {
    setClearAmount(receivableBalance.toString())
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !error && clearAmount) {
      e.preventDefault()
      handleClear()
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div
      className="flex items-center gap-3 py-2"
      role="group"
      aria-labelledby={`vat-clearance-label-${vatCategory}`}
    >
      {/* Category label and balance */}
      <div className="flex-1 min-w-0">
        <div
          id={`vat-clearance-label-${vatCategory}`}
          className="text-sm font-medium truncate"
        >
          {/* {categoryLabel} */}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* <span>Balance: {receivableBalance.toLocaleString()} RWF</span>
          {clearedAmount > 0 && (
            <span className="text-green-600">
              (Cleared: {clearedAmount.toLocaleString()} RWF)
            </span>
          )} */}
        </div>
      </div>

      {/* Status badge and clear button */}
      <div className="flex items-center gap-2">
        {isFullyCleared ? (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 border-green-200"
          >
            <CheckCircle2 className="size-3 mr-1" />
            Cleared
          </Badge>
        ) : hasPendingBalance ? (
          <>
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 border-orange-200"
            >
              <Clock className="size-3 mr-1" />
              Pending
            </Badge>
            {!readOnly && (
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    aria-label={`Clear VAT for ${categoryLabel}`}
                    aria-describedby={`vat-balance-${vatCategory}`}
                  >
                    Clear VAT
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80"
                  align="end"
                  onKeyDown={handleKeyDown}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div>
                      <h4 className="font-medium text-sm">Clear VAT Receivable</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter the amount refunded by RRA
                      </p>
                    </div>

                    {/* Balance info */}
                    <div className="rounded-md bg-muted p-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Current Balance:</span>
                        <span className="font-medium">{receivableBalance.toLocaleString()} RWF</span>
                      </div>
                    </div>

                    {/* Amount input */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`clear-amount-${vatCategory}`}
                        className="text-sm"
                      >
                        Amount Cleared
                      </Label>
                      <Input
                        id={`clear-amount-${vatCategory}`}
                        type="number"
                        value={clearAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="Enter amount"
                        max={receivableBalance}
                        min={0}
                        step="0.01"
                        className={cn(
                          error && "border-destructive focus-visible:ring-destructive"
                        )}
                        aria-invalid={!!error}
                        aria-describedby={error ? `clear-error-${vatCategory}` : undefined}
                        autoFocus
                      />
                      {error && (
                        <p
                          id={`clear-error-${vatCategory}`}
                          className="text-xs text-destructive"
                          role="alert"
                          aria-live="polite"
                        >
                          {error}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleClear}
                        disabled={!clearAmount || !!error}
                        className="flex-1"
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearFullAmount}
                        className="flex-1"
                      >
                        Clear Full Amount
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </>
        ) : null}
      </div>

      {/* Screen reader only balance info */}
      <span id={`vat-balance-${vatCategory}`} className="sr-only">
        Current VAT receivable balance is {receivableBalance.toLocaleString()} Rwanda Francs
      </span>
    </div>
  )
}
