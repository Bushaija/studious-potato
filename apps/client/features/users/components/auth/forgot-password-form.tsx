"use client"

import { LogoIcon } from '@/features/users/components/auth/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

interface ForgotPasswordFormProps {
    onSubmit?: (email: string) => Promise<void> | void
    logoHref?: string
    loginHref?: string
    className?: string
    isLoading?: boolean
}

export function ForgotPasswordForm({
    onSubmit,
    logoHref = '/',
    loginHref = '/sign-in',
    className = '',
    isLoading = false,
}: ForgotPasswordFormProps) {
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        
        console.log('[FORGOT-PASSWORD-FORM] Form submitted with email:', email)
        console.log('[FORGOT-PASSWORD-FORM] onSubmit function exists:', !!onSubmit)
        console.log('[FORGOT-PASSWORD-FORM] isLoading:', isLoading)
        
        if (onSubmit) {
            console.log('[FORGOT-PASSWORD-FORM] Calling onSubmit...')
            try {
                await onSubmit(email)
                console.log('[FORGOT-PASSWORD-FORM] onSubmit completed successfully')
            } catch (error) {
                console.error('[FORGOT-PASSWORD-FORM] onSubmit error:', error)
            }
        } else {
            console.warn('[FORGOT-PASSWORD-FORM] No onSubmit function provided!')
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={`bg-muted m-auto h-fit w-full max-w-sm overflow-hidden rounded-[calc(var(--radius)+.125rem)] border shadow-md shadow-zinc-950/5 dark:[--color-muted:var(--color-zinc-900)] ${className}`}>
            <div className="bg-card -m-px rounded-[calc(var(--radius)+.125rem)] border p-8 pb-6">
                <div className="text-center">
                    <Link
                        href={logoHref}
                        aria-label="go home"
                        className="mx-auto block w-fit">
                        <LogoIcon />
                    </Link>
                    <h1 className="mb-1 mt-4 text-xl font-semibold">Recover Password</h1>
                    <p className="text-sm">Enter your email to receive a reset link</p>
                </div>

                <div className="mt-6 space-y-6">
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
                            placeholder="name@example.com"
                            disabled={isLoading}
                        />
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-muted-foreground text-sm">We'll send you a link to reset your password.</p>
                </div>
            </div>

            <div className="p-3">
                <p className="text-accent-foreground text-center text-sm">
                    Remembered your password?
                    <Button
                        asChild
                        variant="link"
                        className="px-2"
                        disabled={isLoading}>
                        <Link href={loginHref}>Log in</Link>
                    </Button>
                </p>
            </div>
        </form>
    )
} 