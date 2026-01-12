"use client"

import { ResetPasswordForm } from '@/features/users/components/auth/reset-password-form'
import { useResetPassword } from '@/hooks/mutations/users/use-reset-password'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ResetPasswordContent() {
    const searchParams = useSearchParams()
    const resetPassword = useResetPassword()
    
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    const handleSubmit = async (data: { email: string; newPassword: string }) => {
        await resetPassword.mutateAsync(data)
    }

    // Show error if token or email is missing
    if (!token || !email) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
                    <h1 className="mb-4 text-2xl font-semibold">Invalid Reset Link</h1>
                    <p className="mb-6 text-muted-foreground">
                        This password reset link is invalid or has expired. Please request a new password reset.
                    </p>
                    <a
                        href="/forgot-password"
                        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Request New Reset Link
                    </a>
                </div>
            </section>
        )
    }

    return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
            <ResetPasswordForm
                email={email}
                onSubmit={handleSubmit}
                isLoading={resetPassword.isPending}
            />
        </section>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="text-center">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </section>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
