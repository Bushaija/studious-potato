"use client"

import { ForgotPasswordForm } from '@/features/users/components/auth/forgot-password-form'
import { useForgotPassword } from '@/hooks/mutations/users/use-forgot-password'

export default function ForgotPasswordPage() {
    const forgotPassword = useForgotPassword()

    const handleSubmit = async (email: string) => {
        await forgotPassword.mutateAsync({ email })
    }

    return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
            <ForgotPasswordForm 
                onSubmit={handleSubmit}
                isLoading={forgotPassword.isPending}
            />
        </section>
    )
}
