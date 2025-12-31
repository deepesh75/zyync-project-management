import { prisma } from './prisma'

export interface SeatCheckResult {
  allowed: boolean
  seatsUsed: number
  seatsAllowed: number
  message?: string
}

/**
 * Check if an organization has available seats
 */
export async function checkSeatAvailability(
  organizationId: string
): Promise<SeatCheckResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      seatsAllowed: true,
      seatsUsed: true,
      billingStatus: true,
      _count: {
        select: {
          members: true,
          invitations: {
            where: {
              acceptedAt: null,
              expiresAt: { gt: new Date() }
            }
          }
        }
      }
    }
  })

  if (!org) {
    return {
      allowed: false,
      seatsUsed: 0,
      seatsAllowed: 0,
      message: 'Organization not found'
    }
  }

  // Calculate actual seats used (active members + pending invites)
  const actualSeatsUsed = org._count.members + org._count.invitations

  // Update seatsUsed if it's out of sync
  if (actualSeatsUsed !== org.seatsUsed) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { seatsUsed: actualSeatsUsed }
    })
  }

  const available = actualSeatsUsed < org.seatsAllowed

  return {
    allowed: available,
    seatsUsed: actualSeatsUsed,
    seatsAllowed: org.seatsAllowed,
    message: available 
      ? undefined 
      : `No seats available. You're using ${actualSeatsUsed} of ${org.seatsAllowed} seats.`
  }
}

/**
 * Increment seat usage for an organization
 */
export async function incrementSeatsUsed(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      seatsUsed: {
        increment: 1
      }
    }
  })
}

/**
 * Decrement seat usage for an organization
 */
export async function decrementSeatsUsed(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      seatsUsed: {
        decrement: 1
      }
    }
  })
}

/**
 * Sync seat count with actual members + pending invites
 */
export async function syncSeatsUsed(organizationId: string): Promise<number> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      _count: {
        select: {
          members: true,
          invitations: {
            where: {
              acceptedAt: null,
              expiresAt: { gt: new Date() }
            }
          }
        }
      }
    }
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const actualSeatsUsed = org._count.members + org._count.invitations

  await prisma.organization.update({
    where: { id: organizationId },
    data: { seatsUsed: actualSeatsUsed }
  })

  return actualSeatsUsed
}

/**
 * Get seat pricing information for an organization
 */
export async function getSeatPricing(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planId: true,
      perSeatPriceCents: true,
      seatsAllowed: true,
      seatsUsed: true
    }
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  // Default pricing per plan if not set
  const defaultPricing: Record<string, number> = {
    'free': 0,
    'pro': 1000, // $10 per seat per month in cents
    'enterprise': 2500 // $25 per seat per month in cents
  }

  const planType = org.planId?.includes('P-') ? 'pro' : (org.planId || 'free')
  const basePlan = planType.includes('pro') ? 'pro' : planType.includes('enterprise') ? 'enterprise' : 'free'
  
  const perSeatPrice = org.perSeatPriceCents || defaultPricing[basePlan] || 0

  return {
    planId: org.planId,
    perSeatPriceCents: perSeatPrice,
    seatsAllowed: org.seatsAllowed,
    seatsUsed: org.seatsUsed,
    availableSeats: org.seatsAllowed - org.seatsUsed,
    monthlyCostCents: org.seatsAllowed * perSeatPrice
  }
}

/**
 * Calculate prorated cost for adding seats mid-cycle
 */
export function calculateProratedCost(
  additionalSeats: number,
  perSeatPriceCents: number,
  billingCycleAnchor: Date | null
): number {
  if (!billingCycleAnchor) {
    // No proration if no cycle anchor - charge full month
    return additionalSeats * perSeatPriceCents
  }

  const now = new Date()
  const cycleStart = new Date(billingCycleAnchor)
  
  // Calculate next billing date (30 days from anchor)
  const nextBillingDate = new Date(cycleStart)
  nextBillingDate.setDate(nextBillingDate.getDate() + 30)

  // Calculate days remaining in current cycle
  const daysInCycle = 30
  const daysRemaining = Math.max(
    0,
    Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Prorated cost = (days remaining / total days) * full price
  const proratedCost = Math.ceil(
    (daysRemaining / daysInCycle) * additionalSeats * perSeatPriceCents
  )

  return proratedCost
}
