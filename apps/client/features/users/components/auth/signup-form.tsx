"use client"

import { LogoIcon } from '@/features/users/components/auth/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

interface SignupFormData {
    firstName: string
    lastName: string
    email: string
    password: string
}

interface SignupFormProps {
    onSubmit?: (data: SignupFormData) => Promise<void> | void
    onGoogleSignup?: () => Promise<void> | void
    onMicrosoftSignup?: () => Promise<void> | void
    logoHref?: string
    signinHref?: string
    className?: string
}

export function SignupForm({
    onSubmit,
    onGoogleSignup,
    onMicrosoftSignup,
    logoHref = '/',
    signinHref = '/sign-in',
    className = '',
}: SignupFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const formData = new FormData(e.currentTarget)
            const data: SignupFormData = {
                firstName: formData.get('firstName') as string,
                lastName: formData.get('lastName') as string,
                email: formData.get('email') as string,
                password: formData.get('password') as string,
            }

            if (onSubmit) {
                await onSubmit(data)
            }
        } catch (err) {
            setError('Failed to create account. Please try again.')
            console.error('Signup error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialSignup = async (provider: 'google' | 'microsoft') => {
        setError(null)
        setIsLoading(true)

        try {
            if (provider === 'google' && onGoogleSignup) {
                await onGoogleSignup()
            } else if (provider === 'microsoft' && onMicrosoftSignup) {
                await onMicrosoftSignup()
            }
        } catch (err) {
            setError(`Failed to sign up with ${provider}. Please try again.`)
            console.error(`${provider} signup error:`, err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={`bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)] ${className}`}>
            <div className="p-8 pb-6">
                <div>
                    <Link
                        href={logoHref}
                        aria-label="go home">
                        <LogoIcon />
                    </Link>
                    <h1 className="text-title mb-1 mt-4 text-xl font-semibold">Create a Tailark Account</h1>
                    <p className="text-sm">Welcome! Create an account to get started</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialSignup('google')}
                        disabled={isLoading}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="0.98em"
                            height="1em"
                            viewBox="0 0 256 262"
                            className="mr-2">
                            <path
                                fill="#4285f4"
                                d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
                            <path
                                fill="#34a853"
                                d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
                            <path
                                fill="#fbbc05"
                                d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"></path>
                            <path
                                fill="#eb4335"
                                d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
                        </svg>
                        <span>Google</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSocialSignup('microsoft')}
                        disabled={isLoading}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="1em"
                            height="1em"
                            viewBox="0 0 256 256"
                            className="mr-2">
                            <path
                                fill="#f1511b"
                                d="M121.666 121.666H0V0h121.666z"></path>
                            <path
                                fill="#80cc28"
                                d="M256 121.666H134.335V0H256z"></path>
                            <path
                                fill="#00adef"
                                d="M121.663 256.002H0V134.336h121.663z"></path>
                            <path
                                fill="#fbbc09"
                                d="M256 256.002H134.335V134.336H256z"></path>
                        </svg>
                        <span>Microsoft</span>
                    </Button>
                </div>

                <hr className="my-4 border-dashed" />

                <div className="space-y-5">
                    {error && (
                        <p className="text-destructive text-sm text-center">
                            {error}
                        </p>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label
                                htmlFor="firstName"
                                className="block text-sm">
                                First Name
                            </Label>
                            <Input
                                type="text"
                                required
                                name="firstName"
                                id="firstName"
                                disabled={isLoading}
                                aria-describedby={error ? "error-message" : undefined}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="lastName"
                                className="block text-sm">
                                Last Name
                            </Label>
                            <Input
                                type="text"
                                required
                                name="lastName"
                                id="lastName"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

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

                    <div className="space-y-2">
                        <Label
                            htmlFor="password"
                            className="text-title text-sm">
                            Password
                        </Label>
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
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </Button>
                </div>
            </div>

            <div className="bg-muted rounded-(--radius) border p-3">
                <p className="text-accent-foreground text-center text-sm">
                    Already have an account?
                    <Button
                        asChild
                        variant="link"
                        className="px-2"
                        disabled={isLoading}>
                        <Link href={signinHref}>Sign In</Link>
                    </Button>
                </p>
            </div>
        </form>
    )
} 