// lib/permissions.ts
type UserRole = 'superadmin' | 'admin' | 'accountant' | 'project_manager'
type Permission = 'planning' | 'execution' | 'compiled' | 'reports' | 'administration'

const rolePermissions: Record<UserRole, Permission[]> = {
  superadmin: ['planning', 'execution', 'compiled', 'reports', 'administration'],
  admin: ['reports', 'administration'],
  accountant: ['reports'],
  project_manager: ['planning', 'execution', 'compiled', 'reports']
}

export function hasPermission(user: any, permission: Permission): boolean {
  const userRole = user.role as UserRole
  return rolePermissions[userRole]?.includes(permission) ?? false
}

export function getUserPermissions(user: any): Permission[] {
  const userRole = user.role as UserRole
  return rolePermissions[userRole] ?? []
}

/**
 * 
 * TODOS
 * 
    2. PERMISSION UTILITY FUNCTION

    // app/dashboard/planning/page.tsx
    import { redirect } from 'next/navigation'
    import { auth } from '@/lib/auth-server' // Server-side auth helper
    import { hasPermission } from '@/lib/permissions'

    export default async function PlanningPage() {
    const session = await auth.api.getSession()
    
    if (!session) {
        redirect('/login')
    }

    // Check if user has planning access
    if (!hasPermission(session.user, 'planning')) {
        redirect('/dashboard?error=unauthorized')
    }

    return (
        // Your planning page content
    )
    }
 * 


    3. LAYOUT-LEVEL PROTECTION

    // app/dashboard/layout.tsx
    import { redirect } from 'next/navigation'
    import { auth } from '@/lib/auth-server'

    export default async function DashboardLayout({
    children,
    }: {
    children: React.ReactNode
    }) {
    const session = await auth.api.getSession()
    
    if (!session) {
        redirect('/login')
    }

    if (!session.user.isActive) {
        redirect('/login?error=account_deactivated')
    }

    return (
        <div className="dashboard-layout">
        <Sidebar user={session.user} />
        <main>{children}</main>
        </div>
    )

    4. MIDDLEWARE PROTECTION

    // middleware.ts
    import { NextResponse } from 'next/server'
    import type { NextRequest } from 'next/server'
    import { hasPermission } from '@/lib/permissions'

    const protectedRoutes = {
    '/dashboard/planning': 'planning',
    '/dashboard/execution': 'execution', 
    '/dashboard/compiled': 'compiled',
    '/dashboard/administration': 'administration'
    }

    export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    
    // Check if route needs protection
    const requiredPermission = protectedRoutes[pathname]
    if (requiredPermission) {
        // Get session (you'll need to implement this)
        const session = await getSessionFromRequest(request)
        
        if (!session || !hasPermission(session.user, requiredPermission)) {
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url))
        }
    }
    
    return NextResponse.next()
    }

    export const config = {
        matcher: ['/dashboard/:path*']
        }
    }

    5. UPDATE SIDEBAR

    // components/Sidebar.tsx
    import { hasPermission, getUserPermissions } from '@/lib/permissions'

    export function Sidebar({ user }: { user: any }) {
    const permissions = getUserPermissions(user)
    
    return (
        <nav>
        <Link href="/dashboard">Dashboard</Link>
        
        {permissions.includes('reports') && (
            <div>
            <span>Reports</span>
            // Report sub-items 
            </div>
            )}
            
            {permissions.includes('administration') && (
            <div>
                <span>Administration</span>
                // Admin sub-items 
            </div>
            )}
            
            {permissions.includes('planning') && (
            <Link href="/dashboard/planning">Planning</Link>
            )}
            
            {permissions.includes('execution') && (
            <Link href="/dashboard/execution">Execution</Link>
            )}
            
            {permissions.includes('compiled') && (
            <Link href="/dashboard/compiled">Compiled</Link>
            )}
        </nav>
        )
    }
 */