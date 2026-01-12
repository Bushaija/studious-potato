import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { userMustChangePassword, type ExtendedUser } from '@/types/auth'

/**
 * Middleware to enforce password change for users with mustChangePassword flag
 * 
 * This middleware:
 * 1. Checks if the user has a mustChangePassword flag in their session
 * 2. Redirects to /change-password if the flag is true
 * 3. Allows access to auth pages and the change-password page
 * 4. Prevents access to all other pages until the password is changed
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Define auth-related paths that should be accessible
  const authPaths = [
    '/sign-in',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/change-password',
  ]

  // Define public paths that don't require authentication
  const publicPaths = [
    '/',
    '/api',
    '/_next',
    '/favicon.ico',
  ]

  // Allow access to public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  try {
    // Get the current session
    const session = await getSession(request.headers)

    // If no session, allow Next.js to handle the redirect (dashboard layout will redirect to sign-in)
    if (!session?.data?.user) {
      return NextResponse.next()
    }

    const user = session.data.user as ExtendedUser
    const isChangePasswordPage = pathname === '/change-password'

    // Check if user must change password using type guard
    if (userMustChangePassword(user)) {
      // If already on change-password page, allow access
      if (isChangePasswordPage) {
        return NextResponse.next()
      }

      // If on any other page (including other auth pages), redirect to change-password
      if (!isChangePasswordPage) {
        const changePasswordUrl = new URL('/change-password', request.url)
        return NextResponse.redirect(changePasswordUrl)
      }
    }

    // If user doesn't need to change password, allow normal access
    return NextResponse.next()
  } catch (error) {
    // If there's an error getting the session, log it and continue
    // This prevents the middleware from blocking all requests if there's an issue
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

/**
 * Configure which routes the middleware should run on
 * 
 * We exclude:
 * - API routes (handled separately)
 * - Static files (_next/static)
 * - Image optimization (_next/image)
 * - Favicon and other public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
