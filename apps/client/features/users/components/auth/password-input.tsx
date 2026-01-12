"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  error?: string
  showStrength?: boolean
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, showStrength, disabled, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev)
    }

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn(
              "pr-10",
              error && "border-destructive focus-visible:ring-destructive/20",
              className
            )}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : undefined}
            ref={ref}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {error && (
          <p
            id={`${props.id}-error`}
            className="text-sm font-medium text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
