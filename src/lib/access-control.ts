import { prisma } from './prisma'

export interface AccessCheckResult {
  allowed: boolean
  reason?: 'subscription_expired' | 'subscription_canceled' | 'payment_failed' | 'trial_ended' | 'seat_limit'
  message?: string
  isGracePeriod?: boolean
  daysRemaining?: number
}

/**
 * Check if organization has active subscription with access rights
 */
export async function checkOrganizationAccess(
  organizationId: string
): Promise<AccessCheckResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      billingStatus: true,
      billingInterval: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      cancelAtPeriodEnd: true,
      seatsAllowed: true,
      seatsUsed: true
    }
  })

  if (!org) {
    return { allowed: false, message: 'Organization not found' }
  }

  const now = new Date()

  // Check 1: Lifetime plan - always allowed
  if (org.billingInterval === 'lifetime') {
    return { allowed: true }
  }

  // Check 2: Trial period
  if (org.billingStatus === 'trialing') {
    if (org.trialEndsAt && org.trialEndsAt > now) {
      const daysRemaining = Math.ceil(
        (org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return { 
        allowed: true, 
        isGracePeriod: daysRemaining <= 3,
        daysRemaining 
      }
    } else {
      return { 
        allowed: false, 
        reason: 'trial_ended',
        message: 'Your trial period has ended. Please upgrade to continue.' 
      }
    }
  }

  // Check 3: Canceled subscriptions
  if (org.billingStatus === 'canceled') {
    // If cancel at period end, allow access until period ends
    if (org.cancelAtPeriodEnd && org.currentPeriodEnd && org.currentPeriodEnd > now) {
      const daysRemaining = Math.ceil(
        (org.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return { 
        allowed: true, 
        isGracePeriod: true,
        daysRemaining,
        reason: 'subscription_canceled'
      }
    } else {
      return { 
        allowed: false, 
        reason: 'subscription_canceled',
        message: 'Your subscription has been canceled. Reactivate to continue.' 
      }
    }
  }

  // Check 4: Past due payments (grace period)
  if (org.billingStatus === 'past_due') {
    // Allow 7-day grace period for past due
    if (org.currentPeriodEnd) {
      const gracePeriodEnd = new Date(org.currentPeriodEnd)
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)
      
      if (now < gracePeriodEnd) {
        const daysRemaining = Math.ceil(
          (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return { 
          allowed: true, 
          isGracePeriod: true,
          daysRemaining,
          reason: 'payment_failed',
          message: 'Payment failed. Please update payment method.' 
        }
      }
    }
    
    return { 
      allowed: false, 
      reason: 'payment_failed',
      message: 'Account suspended due to failed payment. Update payment method.' 
    }
  }

  // Check 5: Subscription expired
  if (org.currentPeriodEnd && org.currentPeriodEnd < now) {
    return { 
      allowed: false, 
      reason: 'subscription_expired',
      message: 'Your subscription has expired. Please renew to continue.' 
    }
  }

  // Check 6: Active subscription
  if (org.billingStatus === 'active') {
    return { allowed: true }
  }

  // Default: deny if status unknown
  return { 
    allowed: false, 
    message: 'Unable to verify subscription status' 
  }
}

/**
 * Check if user can be added (combines access + seat checks)
 */
export async function canAddUser(organizationId: string): Promise<AccessCheckResult> {
  // First check if org has active subscription
  const accessCheck = await checkOrganizationAccess(organizationId)
  if (!accessCheck.allowed) {
    return accessCheck
  }

  // Then check seat availability
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      seatsUsed: true,
      seatsAllowed: true
    }
  })

  if (!org) {
    return { allowed: false, message: 'Organization not found' }
  }

  if (org.seatsUsed >= org.seatsAllowed) {
    return {
      allowed: false,
      reason: 'seat_limit',
      message: `Seat limit reached (${org.seatsUsed}/${org.seatsAllowed}). Upgrade to add more users.`
    }
  }

  return { allowed: true }
}

/**
 * Get read-only mode info (when expired but data preserved)
 */
export async function getReadOnlyStatus(organizationId: string) {
  const accessCheck = await checkOrganizationAccess(organizationId)
  
  return {
    isReadOnly: !accessCheck.allowed,
    reason: accessCheck.reason,
    message: accessCheck.message,
    canView: true, // Always allow viewing data
    canEdit: accessCheck.allowed, // Only allow edits if active
    canInvite: accessCheck.allowed,
    canCreate: accessCheck.allowed,
    isGracePeriod: accessCheck.isGracePeriod,
    daysRemaining: accessCheck.daysRemaining
  }
}
