"use client"

import { useVerifyEmail } from '@/hooks/mutations/users/use-verify-email'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const verifyEmail = useVerifyEmail()
    const [hasVerified, setHasVerified] = useState(false)
    
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    useEffect(() => {
        // Automatically call verification endpoint when component mounts
        if (token && email && !hasVerified) {
            setHasVerified(true)
            verifyEmail.mutate({ email, otp: token })
        }
    }, [token, email, hasVerified, verifyEmail])

    // Show error if token or email is missing
    if (!token || !email) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
                    <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
                    <h1 className="mb-4 text-2xl font-semibold">Invalid Verification Link</h1>
                    <p className="mb-6 text-muted-foreground">
                        This email verification link is invalid or has expired.
                    </p>
                    <a
                        href="/sign-in"
                        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Go to Sign In
                    </a>
                </div>
            </section>
        )
    }

    // Show loading state during verification
    if (verifyEmail.isPending) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
                    <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-primary" />
                    <h1 className="mb-4 text-2xl font-semibold">Verifying Email</h1>
                    <p className="text-muted-foreground">
                        Please wait while we verify your email address...
                    </p>
                </div>
            </section>
        )
    }

    // Show success message
    if (verifyEmail.isSuccess) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
                    <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-600" />
                    <h1 className="mb-4 text-2xl font-semibold">Email Verified!</h1>
                    <p className="mb-6 text-muted-foreground">
                        Your email has been verified successfully. You can now sign in to your account.
                    </p>
                    <a
                        href="/sign-in"
                        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Go to Sign In
                    </a>
                </div>
            </section>
        )
    }

    // Show error message if verification failed
    if (verifyEmail.isError) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
                    <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
                    <h1 className="mb-4 text-2xl font-semibold">Verification Failed</h1>
                    <p className="mb-6 text-muted-foreground">
                        {verifyEmail.error?.message || 'Failed to verify email. The link may have expired or is invalid.'}
                    </p>
                    <a
                        href="/sign-in"
                        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Go to Sign In
                    </a>
                </div>
            </section>
        )
    }

    return null
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="text-center">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </section>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}
