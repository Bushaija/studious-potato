"use client"

import * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FormErrorProps {
  /**
   * Error message to display
   */
  message?: string
  /**
   * Optional title for the error
   */
  title?: string
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Optional action button
   */
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

/**
 * FormError component displays form-level error messages
 * Used for errors that affect the entire form rather than a specific field
 */
export function FormError({
  message,
  title,
  className,
  action,
}: FormErrorProps) {
  if (!message) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-md border border-destructive bg-destructive/10 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="h-5 w-5 flex-shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="flex-1 space-y-1">
          {title && (
            <h3 className="text-sm font-semibold text-destructive">{title}</h3>
          )}
          <p className="text-sm text-destructive/90">{message}</p>
          {action && (
            <div className="mt-3">
              {action.href ? (
                <a
                  href={action.href}
                  className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
                >
                  {action.label}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={action.onClick}
                  className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
