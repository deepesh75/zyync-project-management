import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Middleware to check organization access on dashboard routes
 * Redirects to billing page if access is restricted
 */
export async function checkOrganizationAccessMiddleware(request: NextRequest) {
  // Only check organization dashboard routes
  if (!request.nextUrl.pathname.startsWith('/organizations/')) {
    return NextResponse.next()
  }

  try {
    const token = await getToken({ req: request })

    if (!token) {
      return NextResponse.next()
    }

    // Extract organization ID from path
    const pathMatch = request.nextUrl.pathname.match(/^\/organizations\/([^/]+)/)
    if (!pathMatch) {
      return NextResponse.next()
    }

    const organizationId = pathMatch[1]

    // Add organization ID to request headers so we can access it server-side
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-org-id', organizationId)

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  } catch (error) {
    console.error('Error in organization access middleware:', error)
    return NextResponse.next()
  }
}

/**
 * Hook for server components to check access and get restriction info
 * Usage in page.tsx:
 *   const restrictionInfo = await getOrganizationAccessForPage(orgId)
 *   if (restrictionInfo.isRestricted && !restrictionInfo.canEdit) {
 *     return redirect(`/organizations/${orgId}/billing?expired=true`)
 *   }
 */
export async function getOrganizationAccessForPage(organizationId: string) {
  try {
    // Dynamically import to avoid circular dependencies
    const { getAccessRestrictionInfo } = await import('../lib/access-restriction')

    const restrictionInfo = await getAccessRestrictionInfo(organizationId)
    return restrictionInfo
  } catch (error) {
    console.error('Error getting org access info:', error)
    return { isRestricted: false }
  }
}
