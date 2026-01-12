"use client"

import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  PasswordRequirement,
  PasswordStrength,
} from "@/lib/validation/password-policy"

export interface PasswordStrengthIndicatorProps {
  password: string
  strength: PasswordStrength
  requirements: PasswordRequirement[]
  className?: string
}

const strengthConfig = {
  weak: {
    label: "Weak",
    color: "bg-destructive",
    textColor: "text-destructive",
    width: "w-1/3",
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-500",
    textColor: "text-yellow-600 dark:text-yellow-500",
    width: "w-2/3",
  },
  strong: {
    label: "Strong",
    color: "bg-green-500",
    textColor: "text-green-600 dark:text-green-500",
    width: "w-full",
  },
} as const

export function PasswordStrengthIndicator({
  password,
  strength,
  requirements,
  className,
}: PasswordStrengthIndicatorProps) {
  // Don't show anything if password is empty
  if (!password) {
    return null
  }

  const config = strengthConfig[strength]

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Password strength</span>
          <span className={cn("text-sm font-medium", config.textColor)}>
            {config.label}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-300 ease-in-out",
              config.color,
              config.width
            )}
            role="progressbar"
            aria-valuenow={
              strength === "weak" ? 33 : strength === "medium" ? 66 : 100
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Password strength: ${config.label}`}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Password requirements</span>
        <ul className="space-y-1.5" role="list">
          {requirements.map((requirement) => (
            <li
              key={requirement.key}
              className="flex items-center gap-2 text-sm"
            >
              {requirement.met ? (
                <Check
                  className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-500"
                  aria-hidden="true"
                />
              ) : (
                <X
                  className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  requirement.met
                    ? "text-green-600 dark:text-green-500"
                    : "text-muted-foreground"
                )}
              >
                {requirement.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
