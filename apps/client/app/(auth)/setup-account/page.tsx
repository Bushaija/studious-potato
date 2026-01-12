"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function SetupAccountPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isVerifying, setIsVerifying] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [tokenValid, setTokenValid] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // Verify token on mount
    useEffect(() => {
        const verifyToken = async () => {
            if (!token || !email) {
                setError('Invalid setup link. Please contact your administrator.')
                setIsVerifying(false)
                return
            }

            // For Better Auth, we don't need to pre-verify the token
            // It will be verified when the user submits the form
            // Just check if token and email exist
            setTokenValid(true)
            setIsVerifying(false)
        }

        verifyToken()
    }, [token, email])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters long')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsSubmitting(true)

        try {
            // Use custom setup-password endpoint
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/accounts/setup-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token!,
                    email: email!,
                    password: password,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to set password' }))
                throw new Error(errorData.message || 'Failed to set password')
            }

            const data = await response.json()
            setSuccess(true)
            
            // Redirect to sign in after 2 seconds
            setTimeout(() => {
                router.push('/sign-in?message=Account setup complete. Please sign in.')
            }, 2000)
        } catch (err: any) {
            setError(err.message || 'Failed to set password')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (isVerifying) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Verifying your setup link...</p>
                    </CardContent>
                </Card>
            </section>
        )
    }

    // Success state
    if (success) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Account Setup Complete!</h2>
                        <p className="text-muted-foreground text-center">
                            Your password has been set successfully. Redirecting to sign in...
                        </p>
                    </CardContent>
                </Card>
            </section>
        )
    }

    // Error state (invalid token)
    if (!tokenValid) {
        return (
            <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-transparent">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <XCircle className="h-12 w-12 text-red-600 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Invalid Setup Link</h2>
                        <p className="text-muted-foreground text-center mb-6">
                            {error || 'This setup link is invalid or has expired.'}
                        </p>
                        <Button onClick={() => router.push('/rina/sign-in')}>
                            Go to Sign In
                        </Button>
                    </CardContent>
                </Card>
            </section>
        )
    }

    // Setup form
    return (
        <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-transparent">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Set Up Your Account</CardTitle>
                    <CardDescription>
                        Create a password for {email}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                minLength={8}
                                disabled={isSubmitting}
                            />
                            <p className="text-xs text-muted-foreground">
                                Must be at least 8 characters long
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                required
                                minLength={8}
                                disabled={isSubmitting}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                'Set Password & Continue'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </section>
    )
}
