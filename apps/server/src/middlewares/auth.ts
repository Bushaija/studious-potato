import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { auth } from '@/lib/auth_'
import type { AuthSession, AuthUser } from '@/lib/auth_'

// Extend the Hono context with auth
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null
    session: AuthSession | null
  }
}

/**
 * Middleware to get current session (optional - doesn't require auth)
 */
export const getSessionMiddleware = createMiddleware(async (c, next) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    c.set('user', session?.user || null)
    c.set('session', session?.session || null)
  } catch (error) {
    // Don't throw error, just set null values
    console.warn('Failed to get session:', error)
    c.set('user', null)
    c.set('session', null)
  }

  await next()
})

/**
 * Middleware that requires authentication
 */
export const requireAuth = createMiddleware(async (c, next) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    if (!session.user.isActive) {
      throw new HTTPException(403, {
        message: 'Account is deactivated',
      })
    }

    c.set('user', session.user)
    c.set('session', session.session)
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }
    
    console.error('Auth middleware error:', error)
    throw new HTTPException(401, {
      message: 'Invalid authentication',
    })
  }

  await next()
})

/**
 * Role-based authorization middleware
 */
export const requireRole = (...roles: string[]) => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    if (!roles.includes(user.role)) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions',
      })
    }

    await next()
  })
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('admin')

/**
 * Facility access middleware - checks if user has access to facility
 */
export const requireFacilityAccess = (facilityIdParam = 'facilityId') => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    const facilityId = c.req.param(facilityIdParam)

    // Admin users have access to all facilities
    if (user.role === 'admin') {
      await next()
      return
    }

    // Check if user has access to this specific facility
    const permissions = (user.permissions as string[]) || []
    const hasAccess = user.facilityId === parseInt(facilityId) || 
                     permissions.includes('admin_access')

    if (!hasAccess) {
      throw new HTTPException(403, {
        message: 'Access denied to this facility',
      })
    }

    await next()
  })
}

/**
 * Project access middleware - checks if user has access to project
 */
export const requireProjectAccess = (projectIdParam = 'projectId') => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    const projectId = parseInt(c.req.param(projectIdParam))

    // Admin users have access to all projects
    if (user.role === 'admin') {
      await next()
      return
    }

    // Check if user has access to this project
    const projectAccess = user.projectAccess as number[] || []
    const hasAccess = projectAccess.includes(projectId)

    if (!hasAccess) {
      throw new HTTPException(403, {
        message: 'Access denied to this project',
      })
    }

    await next()
  })
}

/**
 * Configuration access middleware - checks if user can access specific configs
 */
export const requireConfigAccess = (configType: string) => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    // Admin users have access to all configurations
    if (user.role === 'admin') {
      await next()
      return
    }

    // Check if user has access to this configuration type
    const configAccess = user.configAccess as Record<string, boolean> || {}
    const hasAccess = configAccess[configType] === true

    if (!hasAccess) {
      throw new HTTPException(403, {
        message: `Access denied to ${configType} configuration`,
      })
    }

    await next()
  })
}

/**
 * Organization membership middleware - checks if user belongs to organization
 */
export const requireOrgMembership = (orgIdParam = 'organizationId') => {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    const organizationId = c.req.param(orgIdParam)

    // This would need to be implemented with a database query
    // to check organization membership through the member table
    // For now, we'll implement the basic structure
    
    try {
      const membership = await auth.api.getActiveMemberships({
        headers: c.req.raw.headers,
      })

      const isMember = membership?.some(m => m.organizationId === organizationId)

      if (!isMember) {
        throw new HTTPException(403, {
          message: 'Organization membership required',
        })
      }

      await next()
    } catch (error) {
      console.error('Organization membership check failed:', error)
      throw new HTTPException(403, {
        message: 'Organization access denied',
      })
    }
  })
}

/**
 * Rate limiting middleware (basic implementation)
 */
export const rateLimit = (options: {
  windowMs: number
  max: number
  keyGenerator?: (c: any) => string
}) => {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return createMiddleware(async (c, next) => {
    const key = options.keyGenerator ? 
      options.keyGenerator(c) : 
      c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous'

    const now = Date.now()
    const windowStart = now - options.windowMs

    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < now) {
        requests.delete(k)
      }
    }

    const current = requests.get(key) || { count: 0, resetTime: now + options.windowMs }

    if (current.resetTime < now) {
      current.count = 0
      current.resetTime = now + options.windowMs
    }

    current.count++
    requests.set(key, current)

    if (current.count > options.max) {
      throw new HTTPException(429, {
        message: 'Too many requests',
      })
    }

    await next()
  })
}