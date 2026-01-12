"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "./password-input"
import { PasswordStrengthIndicator } from "./password-strength-indicator"
import { usePasswordValidation } from "@/hooks/use-password-validation"
import { cn } from "@/lib/utils"
import { PASSWORD_ERROR_MESSAGES } from "@/lib/validation/password-policy"
import Link from "next/link"

export interface ChangePasswordFormProps {
  onSubmit: (data: {
    currentPassword: string
    newPassword: string
  }) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function ChangePasswordForm({
  onSubmit,
  isLoading = false,
  className,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [errors, setErrors] = React.useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
    form?: string
  }>({})

  // Validate new password in real-time
  const validation = usePasswordValidation(newPassword)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    // Validate current password
    if (!currentPassword) {
      setErrors((prev) => ({
        ...prev,
        currentPassword: PASSWORD_ERROR_MESSAGES.REQUIRED,
      }))
      return
    }

    // Validate new password
    if (!newPassword) {
      setErrors((prev) => ({
        ...prev,
        newPassword: PASSWORD_ERROR_MESSAGES.REQUIRED,
      }))
      return
    }

    if (!validation.isValid) {
      setErrors((prev) => ({
        ...prev,
        newPassword: validation.errors[0] || "Password does not meet requirements",
      }))
      return
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: PASSWORD_ERROR_MESSAGES.PASSWORDS_DONT_MATCH,
      }))
      return
    }

    try {
      await onSubmit({ currentPassword, newPassword })
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Failed to change password. Please try again.",
      })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "bg-card m-auto h-fit w-full max-w-md rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md",
        className
      )}
    >
      <div className="p-6">
        <div className="mb-6">
          <h1 className="mb-2 text-xl font-semibold">Change Password</h1>
          <p className="text-sm text-muted-foreground">
            You must change your password before continuing
          </p>
        </div>

        {errors.form && (
          <div
            className="mb-4 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {errors.form}
          </div>
        )}

        <div className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <PasswordInput
              id="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={errors.currentPassword}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.newPassword}
              disabled={isLoading}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <PasswordStrengthIndicator
              password={newPassword}
              strength={validation.strength}
              requirements={validation.requirements}
            />
          )}

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              disabled={isLoading}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !validation.isValid}
          >
            {isLoading ? "Changing Password..." : "Change Password"}
          </Button>

          {/* Back to Sign In Link */}
          <div className="text-center">
            <Button
              asChild
              variant="link"
              size="sm"
              disabled={isLoading}
            >
              <Link href="/sign-in" className="text-sm text-muted-foreground">
                Back to Sign In
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
