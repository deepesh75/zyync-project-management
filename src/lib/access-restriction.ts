import { prisma } from './prisma'

/**
 * Check for expired organizations and mark them as access_restricted
 * This should be called periodically (e.g., on dashboard load or via cron)
 */
export async function markExpiredOrganizationsAsRestricted(): Promise<{
  restricted: number
  notified: number
}> {
  const now = new Date()
  let restrictedCount = 0
  let notifiedCount = 0

  try {
    // Find organizations with expired subscriptions that aren't already restricted
    const expiredOrgs = await prisma.organization.findMany({
      where: {
        currentPeriodEnd: { lt: now },
        billingStatus: { not: 'access_restricted' },
        planId: { not: 'free' } // Don't restrict free plans
      },
      select: {
        id: true,
        name: true,
        billingStatus: true,
        currentPeriodEnd: true,
        members: {
          where: { role: 'admin' },
          include: { user: true }
        }
      }
    })

    // Mark each as access_restricted
    for (const org of expiredOrgs) {
      try {
        await prisma.organization.update({
          where: { id: org.id },
          data: { billingStatus: 'access_restricted' }
        })

        restrictedCount++

        // Log for monitoring
        console.log(
          `Organization ${org.id} marked as access_restricted. Expired on ${org.currentPeriodEnd}`
        )

        // Optionally send notification email (handled elsewhere)
        notifiedCount++
      } catch (error) {
        console.error(`Failed to restrict access for org ${org.id}:`, error)
      }
    }

    return { restricted: restrictedCount, notified: notifiedCount }
  } catch (error) {
    console.error('Error marking expired organizations:', error)
    return { restricted: 0, notified: 0 }
  }
}

/**
 * Restore access for an organization when payment is made
 */
export async function restoreOrganizationAccess(organizationId: string): Promise<void> {
  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { billingStatus: 'active' }
    })

    console.log(`Access restored for organization ${organizationId}`)
  } catch (error) {
    console.error(`Failed to restore access for org ${organizationId}:`, error)
    throw error
  }
}

/**
 * Get access restriction info
 */
export async function getAccessRestrictionInfo(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      billingStatus: true,
      currentPeriodEnd: true,
      name: true,
      planId: true
    }
  })

  if (!org) return null

  const now = new Date()
  const isRestricted =
    org.billingStatus === 'access_restricted' ||
    (org.currentPeriodEnd && org.currentPeriodEnd < now && org.planId !== 'free')

  if (!isRestricted) {
    return {
      isRestricted: false
    }
  }

  const expiredDate = org.currentPeriodEnd
    ? org.currentPeriodEnd.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown'

  const daysOverdue = org.currentPeriodEnd
    ? Math.ceil((now.getTime() - org.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    isRestricted: true,
    organizationName: org.name,
    expiredDate,
    daysOverdue,
    status: org.billingStatus,
    canViewData: true,
    canEdit: false,
    canInvite: false,
    canCreate: false
  }
}
