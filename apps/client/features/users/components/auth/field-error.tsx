"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FieldErrorProps {
  /**
   * Error message to display
   */
  message?: string
  /**
   * ID of the field this error is associated with
   * Used for aria-describedby linking
   */
  fieldId?: string
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * FieldError component displays inline error messages for form fields
 * Should be placed directly below the input field it relates to
 */
export function FieldError({ message, fieldId, className }: FieldErrorProps) {
  if (!message) return null

  return (
    <p
      id={fieldId ? `${fieldId}-error` : undefined}
      role="alert"
      aria-live="polite"
      className={cn("text-sm font-medium text-destructive", className)}
    >
      {message}
    </p>
  )
}
