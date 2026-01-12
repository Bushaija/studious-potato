"use client"

import { LogoIcon } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

interface LoginFormProps {
    onSubmit?: (data: { email: string; password: string }) => Promise<void> | void
    onGoogleLogin?: () => Promise<void> | void
    onMicrosoftLogin?: () => Promise<void> | void
    logoHref?: string
    signupHref?: string
    forgotPasswordHref?: string
    className?: string
    isLoading?: boolean
}

export function LoginForm({
    onSubmit,
    logoHref = '/',
    signupHref = '/signup',
    forgotPasswordHref = '/forgot-password',
    className = '',
    isLoading: externalIsLoading,
}: LoginFormProps) {
    const [internalIsLoading, setInternalIsLoading] = useState(false)

    // Use external loading state if provided, otherwise use internal state
    const isLoading = externalIsLoading !== undefined ? externalIsLoading : internalIsLoading

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        
        // Only manage internal loading state if no external loading state is provided
        if (externalIsLoading === undefined) {
            setInternalIsLoading(true)
        }

        try {
            const formData = new FormData(e.currentTarget)
            const email = formData.get('email') as string
            const password = formData.get('password') as string

            if (onSubmit) {
                await onSubmit({ email, password })
            }
        } finally {
            // Only manage internal loading state if no external loading state is provided
            if (externalIsLoading === undefined) {
                setInternalIsLoading(false)
            }
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={`bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)] ${className}`}>
            <div className="p-4">
                <div className="flex flex-col items-center gap-2">
                    <LogoIcon />
                    <div className="flex flex-col items-center">
                      <h1 className="mb-1 text-lg font-semibold">Sign in to AFRS</h1>
                      <p className="text-sm">Welcome back! Sign in to continue</p>
                    </div>
                </div>

                <hr className="my-4 border-dashed" />

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label
                            htmlFor="email"
                            className="block text-sm">
                            Email
                        </Label>
                        <Input
                            type="email"
                            required
                            name="email"
                            id="email"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                            <Label
                                htmlFor="password"
                                className="text-title text-sm">
                                Password
                            </Label>
                            <Button
                                asChild
                                variant="link"
                                size="sm"
                                disabled={isLoading}>
                                <Link
                                    href={`#${forgotPasswordHref}`}
                                    className="link intent-info variant-ghost text-sm">
                                    Forgot your Password?
                                </Link>
                            </Button>
                        </div>
                        <Input
                            type="password"
                            required
                            name="password"
                            id="password"
                            disabled={isLoading}
                            className="input sz-md variant-mixed"
                        />
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </div>
            </div>

            <div className="bg-muted rounded-(--radius) border p-3">
                <p className="text-accent-foreground text-center text-sm">
                    Accounts are created by administrators. 
                </p>
                <p className="text-accent-foreground text-center text-sm">
                    Please contact your administrator for access.
                </p>
            </div>
        </form>
    )
} 