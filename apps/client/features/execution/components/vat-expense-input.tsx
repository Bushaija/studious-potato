"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PaymentStatusControl, PaymentStatus } from "./payment-status-control"

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export interface VATExpenseInputProps {
  expenseCode: string
  expenseName: string
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  netAmount: number
  vatAmount: number
  totalAmount: number
  paymentStatus: PaymentStatus
  amountPaid: number
  onNetAmountChange: (netAmount: number) => void
  onVATAmountChange: (vatAmount: number) => void
  onPaymentChange: (status: PaymentStatus, amountPaid: number) => void
  disabled?: boolean
}

export function VATExpenseInput({
  expenseCode,
  expenseName,
  quarter,
  netAmount,
  vatAmount,
  totalAmount,
  paymentStatus,
  amountPaid,
  onNetAmountChange,
  onVATAmountChange,
  onPaymentChange,
  disabled = false,
}: VATExpenseInputProps) {
  // Local state for immediate UI updates
  const [localNetAmount, setLocalNetAmount] = React.useState<string>(String(netAmount || ''))
  const [localVATAmount, setLocalVATAmount] = React.useState<string>(String(vatAmount || ''))

  const [netError, setNetError] = React.useState<string | null>(null)
  const [vatError, setVATError] = React.useState<string | null>(null)
  const [vatWarning, setVATWarning] = React.useState<string | null>(null)

  // Sync local state with props when they change externally
  React.useEffect(() => {
    setLocalNetAmount(String(netAmount || ''))
  }, [netAmount])

  React.useEffect(() => {
    setLocalVATAmount(String(vatAmount || ''))
  }, [vatAmount])

  // Debounce the local values before triggering parent callbacks
  const debouncedNetAmount = useDebounce(localNetAmount, 300)
  const debouncedVATAmount = useDebounce(localVATAmount, 300)

  // Trigger parent callbacks when debounced values change
  React.useEffect(() => {
    const parsed = parseFloat(debouncedNetAmount) || 0
    if (parsed !== netAmount) {
      onNetAmountChange(parsed)
    }
  }, [debouncedNetAmount])

  React.useEffect(() => {
    const parsed = parseFloat(debouncedVATAmount) || 0
    if (parsed !== vatAmount) {
      onVATAmountChange(parsed)
    }
  }, [debouncedVATAmount])

  // Calculate VAT percentage for validation
  const vatPercentage = netAmount > 0 ? (vatAmount / netAmount) * 100 : 0

  // Validate VAT amount
  React.useEffect(() => {
    if (vatAmount < 0) {
      setVATError("VAT amount cannot be negative")
    } else {
      setVATError(null)
    }

    // Show warning if VAT percentage is unusual
    if (vatAmount > 0 && vatPercentage > 30) {
      setVATWarning(`VAT seems high (${vatPercentage.toFixed(1)}% of net amount)`)
    } else {
      setVATWarning(null)
    }
  }, [vatAmount, vatPercentage])

  // Validate net amount
  React.useEffect(() => {
    if (netAmount < 0) {
      setNetError("Net amount cannot be negative")
    } else {
      setNetError(null)
    }
  }, [netAmount])

  const handleNetAmountChange = (value: string) => {
    setLocalNetAmount(value)
  }

  const handleVATAmountChange = (value: string) => {
    setLocalVATAmount(value)
  }

  return (
    <div
      className="flex flex-col gap-3 p-3 border rounded-md bg-blue-50/50"
      role="group"
      aria-labelledby={`vat-expense-label-${expenseCode}`}
    >
      {/* Header with badge and expense name */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          VAT Applicable
        </Badge>
        <span
          id={`vat-expense-label-${expenseCode}`}
          className="text-sm font-medium"
        >
          {expenseName}
        </span>
      </div>

      {/* Input fields grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Net Amount */}
        <div className="space-y-1">
          <Label
            htmlFor={`net-amount-${expenseCode}`}
            className="text-xs font-medium"
          >
            Net Amount
          </Label>
          <Input
            id={`net-amount-${expenseCode}`}
            type="number"
            value={localNetAmount}
            onChange={(e) => handleNetAmountChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "h-9",
              netError && "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={!!netError}
            aria-describedby={netError ? `net-error-${expenseCode} net-hint-${expenseCode}` : `net-hint-${expenseCode}`}
            aria-label={`Net amount for ${expenseName} in ${quarter}`}
          />
          {netError && (
            <p
              id={`net-error-${expenseCode}`}
              className="text-xs text-destructive"
              role="alert"
              aria-live="polite"
            >
              {netError}
            </p>
          )}
          <p id={`net-hint-${expenseCode}`} className="text-xs text-muted-foreground sr-only">
            Enter the expense amount excluding VAT
          </p>
        </div>

        {/* VAT Amount */}
        <div className="space-y-1">
          <Label
            htmlFor={`vat-amount-${expenseCode}`}
            className="text-xs font-medium"
          >
            VAT Amount
          </Label>
          <Input
            id={`vat-amount-${expenseCode}`}
            type="number"
            value={localVATAmount}
            onChange={(e) => handleVATAmountChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "h-9",
              vatError && "border-destructive focus-visible:ring-destructive",
              vatWarning && !vatError && "border-orange-400 focus-visible:ring-orange-400"
            )}
            aria-invalid={!!vatError}
            aria-describedby={
              vatError
                ? `vat-error-${expenseCode} vat-hint-${expenseCode}`
                : vatWarning
                  ? `vat-warning-${expenseCode} vat-hint-${expenseCode}`
                  : `vat-hint-${expenseCode}`
            }
            aria-label={`VAT amount for ${expenseName} in ${quarter}`}
          />
          {vatError && (
            <p
              id={`vat-error-${expenseCode}`}
              className="text-xs text-destructive"
              role="alert"
              aria-live="polite"
            >
              {vatError}
            </p>
          )}
          {vatWarning && !vatError && (
            <p
              id={`vat-warning-${expenseCode}`}
              className="text-xs text-orange-600"
              role="status"
              aria-live="polite"
            >
              {vatWarning}
            </p>
          )}
          <p id={`vat-hint-${expenseCode}`} className="text-xs text-muted-foreground sr-only">
            Enter the VAT amount that will be refunded by RRA
          </p>
        </div>

        {/* Total Invoice (read-only) */}
        <div className="space-y-1">
          <Label
            htmlFor={`total-invoice-${expenseCode}`}
            className="text-xs font-medium"
          >
            Total Invoice
          </Label>
          <Input
            id={`total-invoice-${expenseCode}`}
            type="number"
            value={totalAmount || ''}
            disabled
            className="h-9 bg-gray-100 cursor-not-allowed"
            aria-label={`Total invoice for ${expenseName} in ${quarter}. Auto-calculated as net plus VAT.`}
            aria-describedby={`total-hint-${expenseCode}`}
          />
          <p id={`total-hint-${expenseCode}`} className="text-xs text-muted-foreground sr-only">
            Auto-calculated: Net amount plus VAT amount
          </p>
        </div>
      </div>

      {/* Payment Status Control */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Payment Status:</span>
        <PaymentStatusControl
          expenseCode={expenseCode}
          amount={totalAmount}
          paymentStatus={paymentStatus}
          amountPaid={amountPaid}
          onChange={onPaymentChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
