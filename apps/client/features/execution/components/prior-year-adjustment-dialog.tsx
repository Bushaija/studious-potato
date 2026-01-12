"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Settings2, ArrowUp, ArrowDown } from "lucide-react"

export type AdjustmentType = "increase" | "decrease"

export interface AdjustmentItem {
  code: string
  name: string
  currentBalance: number
}

export interface PriorYearAdjustmentDialogProps {
  type: "payable" | "receivable"
  items: AdjustmentItem[]
  currentValue: number
  onApplyAdjustment: (selectedItemCode: string, adjustmentType: AdjustmentType, amount: number) => void
  disabled?: boolean
}

export function PriorYearAdjustmentDialog({
  type,
  items,
  currentValue,
  onApplyAdjustment,
  disabled = false,
}: PriorYearAdjustmentDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedItem, setSelectedItem] = React.useState<string>("")
  const [adjustmentType, setAdjustmentType] = React.useState<AdjustmentType>("increase")
  const [amount, setAmount] = React.useState<string>("")
  const [error, setError] = React.useState<string | null>(null)

  const typeLabel = type === "payable" ? "Payable" : "Receivable"
  const typeLabelPlural = type === "payable" ? "Payables" : "Receivables"

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedItem("")
      setAdjustmentType("increase")
      setAmount("")
      setError(null)
    }
  }, [isOpen])

  const handleAmountChange = (value: string) => {
    setAmount(value)
    setError(null)

    const parsedAmount = parseFloat(value)
    if (value && isNaN(parsedAmount)) {
      setError("Please enter a valid number")
    } else if (parsedAmount <= 0) {
      setError("Amount must be greater than 0")
    }
  }

  const handleApply = () => {
    // Validation
    if (!selectedItem) {
      setError(`Please select a ${type} to adjust`)
      return
    }

    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount)) {
      setError("Please enter a valid amount")
      return
    }

    if (parsedAmount <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    // For decrease, check if amount exceeds current balance of selected item
    if (adjustmentType === "decrease") {
      const selectedItemData = items.find(item => item.code === selectedItem)
      if (selectedItemData && parsedAmount > selectedItemData.currentBalance) {
        setError(`Amount cannot exceed current balance (${selectedItemData.currentBalance.toLocaleString()} RWF)`)
        return
      }
    }

    // Apply the adjustment
    onApplyAdjustment(selectedItem, adjustmentType, parsedAmount)
    setIsOpen(false)
  }

  const selectedItemData = items.find(item => item.code === selectedItem)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 gap-1"
          aria-label={`Adjust ${typeLabel}`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Adjust
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle>Prior Year {typeLabel} Adjustment</SheetTitle>
          <SheetDescription>
            Select which {type} to adjust, choose increase or decrease, and enter the adjustment amount.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Current Value Display */}
          <div className="rounded-md bg-muted p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Adjustment Value:</span>
              <span className="font-medium">{currentValue.toLocaleString()} RWF</span>
            </div>
          </div>

          {/* Select Item */}
          <div className="space-y-2">
            <Label htmlFor="select-item">Select {typeLabel}</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger id="select-item">
                <SelectValue placeholder={`Choose a ${type}...`} />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    <div className="flex justify-between items-center w-full gap-4">
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({item.currentBalance.toLocaleString()} RWF)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItemData && (
              <p className="text-xs text-muted-foreground">
                Current balance: {selectedItemData.currentBalance.toLocaleString()} RWF
              </p>
            )}
          </div>

          {/* Adjustment Type */}
          <div className="space-y-3">
            <Label>Adjustment Type</Label>
            <RadioGroup
              value={adjustmentType}
              onValueChange={(value) => setAdjustmentType(value as AdjustmentType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="increase" id="increase" />
                <Label
                  htmlFor="increase"
                  className="flex items-center gap-1 cursor-pointer font-normal"
                >
                  <ArrowUp className="h-4 w-4 text-green-600" />
                  Increase
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="decrease" id="decrease" />
                <Label
                  htmlFor="decrease"
                  className="flex items-center gap-1 cursor-pointer font-normal"
                >
                  <ArrowDown className="h-4 w-4 text-red-600" />
                  Decrease
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="adjustment-amount">Adjustment Amount</Label>
            <Input
              id="adjustment-amount"
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Enter amount"
              min={0}
              step="0.01"
              className={cn(error && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={!!error}
              aria-describedby={error ? "adjustment-error" : undefined}
            />
            {error && (
              <p
                id="adjustment-error"
                className="text-xs text-destructive"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}
          </div>

          {/* Preview */}
          {selectedItem && amount && !error && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
              <p className="text-sm font-medium text-blue-900">Preview</p>
              <div className="text-xs text-blue-800 space-y-1">
                <p>
                  {adjustmentType === "increase" ? "Increasing" : "Decreasing"}{" "}
                  <span className="font-medium">{selectedItemData?.name}</span> by{" "}
                  <span className="font-medium">{parseFloat(amount).toLocaleString()} RWF</span>
                </p>
                {selectedItemData && (
                  <p>
                    New balance: {(
                      adjustmentType === "increase"
                        ? selectedItemData.currentBalance + parseFloat(amount)
                        : selectedItemData.currentBalance - parseFloat(amount)
                    ).toLocaleString()} RWF
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleApply}
              disabled={!selectedItem || !amount || !!error}
              className="flex-1"
            >
              Apply Adjustment
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          {/* Info Note */}
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Prior year adjustments affect the closing balance (Section G) 
              and the corresponding {type} balance. These adjustments are used to correct 
              balances from previous reporting periods.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
