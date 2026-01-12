"use client"

import { ChangePasswordForm } from '@/features/users/components/auth/change-password-form'
import { useForcePasswordChange } from '@/hooks/mutations/users/use-force-password-change'
import { authClient } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ChangePasswordPage() {
    const router = useRouter()
    const { data: session, isPending } = authClient.useSession()
    const forcePasswordChange = useForcePasswordChange()
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // Check if user has mustChangePassword flag
        if (!isPending) {
            setIsChecking(false)
            
            // If user doesn't have mustChangePassword flag, redirect to dashboard
            const user = session?.user as any
            if (!user?.mustChangePassword) {
                router.push('/dashboard')
            }
        }
    }, [session, isPending, router])

    const handleSubmit = async (data: { currentPassword: string; newPassword: string }) => {
        await forcePasswordChange.mutateAsync(data)
    }

    // Show loading state while checking session
    if (isChecking || isPending) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <div className="text-center">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </section>
        )
    }

    // Don't render form if user doesn't need to change password
    const user = session?.user as any
    if (!user?.mustChangePassword) {
        return null
    }

    return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
            <ChangePasswordForm
                onSubmit={handleSubmit}
                isLoading={forcePasswordChange.isPending}
            />
        </section>
    )
}
