"use client"

import { LoginForm } from '@/features/users/components/auth/login-form'
import { useState } from 'react'
import { authClient } from '@/lib/auth'
import { useSignInError } from '@/hooks/use-auth-error'

export default function SignInPage() {
    const [isLoading, setIsLoading] = useState(false)
    const { handleError, handleSuccess } = useSignInError()

    const handleSubmit = async (data: { email: string; password: string }) => {
        if (isLoading) return

        setIsLoading(true)
        
        console.log('Login attempt with:', { email: data.email })

        await authClient.signIn.email(
            {
                email: data.email,
                password: data.password,
            },
            {
                onRequest: () => {
                    setIsLoading(true)
                },
                onSuccess: (ctx) => {
                    setIsLoading(false)
                    // Pass the response data to handleSuccess
                    handleSuccess(ctx.data)
                },
                onError: (ctx) => {
                    setIsLoading(false)
                    handleError(ctx)
                }
            }
        )

        setIsLoading(false)
    }

    return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
            <LoginForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
            />
        </section>
    )
}
