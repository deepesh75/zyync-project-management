import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '../../../lib/prisma'

// Admin-only endpoint for tracking seat and billing metrics
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if user is admin (you can customize this check)
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
  if (!adminEmails.includes(session.user.email)) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    if (req.method === 'GET') {
      const { type } = req.query

      // Organizations overview
      if (type === 'organizations' || !type) {
        const orgs = await prisma.organization.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
            paypalPlanId: true,
            seatsAllowed: true,
            seatsUsed: true,
            billingStatus: true,
            billingCycleAnchor: true,
            paypalSubscriptionId: true,
            paypalCustomerId: true,
            trialEndsAt: true,
            createdAt: true,
            members: {
              select: {
                id: true,
                role: true,
                joinedAt: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              },
              orderBy: { joinedAt: 'desc' }
            },
            invitations: {
              where: {
                acceptedAt: null,
                expiresAt: { gt: new Date() }
              },
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                expiresAt: true
              }
            },
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
          },
          orderBy: { createdAt: 'desc' }
        })

        const metrics = {
          totalOrgs: orgs.length,
          byPlan: {
            free: orgs.filter(o => o.planId === 'free' || !o.planId).length,
            pro: orgs.filter(o => o.planId?.includes('pro') || o.planId?.includes('P-')).length,
            enterprise: orgs.filter(o => o.planId?.includes('enterprise')).length
          },
          subscriptions: {
            monthly: orgs.filter(o => o.paypalPlanId === 'P-3N8118553R364412BNFAARJA' || o.planId === 'pro_monthly').length,
            annual: orgs.filter(o => o.paypalPlanId === 'P-1PK53547FK456084XNFKSFJY' || o.planId === 'pro_annual').length,
            lifetime: orgs.filter(o => o.planId === 'pro_lifetime').length,
            total: orgs.filter(o => o.paypalSubscriptionId || o.planId?.includes('pro')).length
          },
          byBillingStatus: {
            active: orgs.filter(o => o.billingStatus === 'active').length,
            past_due: orgs.filter(o => o.billingStatus === 'past_due').length,
            canceled: orgs.filter(o => o.billingStatus === 'canceled').length,
            trialing: orgs.filter(o => o.billingStatus === 'trialing').length
          },
          seatUtilization: orgs.map(o => ({
            id: o.id,
            name: o.name,
            planId: o.planId,
            seatsUsed: o.seatsUsed,
            seatsAllowed: o.seatsAllowed,
            utilizationPercent: o.seatsAllowed > 0 ? Math.round((o.seatsUsed / o.seatsAllowed) * 100) : 0,
            actualMembers: o._count.members,
            pendingInvites: o._count.invitations,
            billingStatus: o.billingStatus,
            paypalSubscriptionId: o.paypalSubscriptionId,
            members: o.members.map(m => ({
              id: m.id,
              userId: m.user.id,
              name: m.user.name,
              email: m.user.email,
              role: m.role,
              joinedAt: m.joinedAt
            })),
            pendingInvitations: o.invitations.map(inv => ({
              id: inv.id,
              email: inv.email,
              role: inv.role,
              createdAt: inv.createdAt,
              expiresAt: inv.expiresAt
            }))
          })),
          atCapacity: orgs.filter(o => o.seatsUsed >= o.seatsAllowed).length,
          overCapacity: orgs.filter(o => o.seatsUsed > o.seatsAllowed).length
        }

        return res.status(200).json(metrics)
      }

      // Billing health check
      if (type === 'billing') {
        const orgs = await prisma.organization.findMany({
          where: {
            OR: [
              { billingStatus: 'past_due' },
              { billingStatus: 'canceled' }
            ]
          },
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
            billingStatus: true,
            paypalSubscriptionId: true,
            paypalCustomerId: true,
            billingCycleAnchor: true,
            _count: {
              select: { members: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        return res.status(200).json({
          totalIssues: orgs.length,
          organizations: orgs
        })
      }

      // Seat capacity warnings
      if (type === 'capacity') {
        // Fetch all organizations and filter in JavaScript
        const orgs = await prisma.organization.findMany({
          select: {
            id: true,
            name: true,
            planId: true,
            seatsUsed: true,
            seatsAllowed: true,
            billingStatus: true,
            _count: {
              select: { members: true }
            }
          },
          orderBy: { seatsUsed: 'desc' }
        })

        const atOrOverCapacity = orgs.filter(o => o.seatsUsed >= o.seatsAllowed)
        const nearCapacity = orgs.filter(o => {
          const utilization = o.seatsAllowed > 0 ? (o.seatsUsed / o.seatsAllowed) : 0
          return utilization >= 0.8 && utilization < 1
        })

        return res.status(200).json({
          atOrOverCapacity: atOrOverCapacity.length,
          nearCapacity: nearCapacity.length,
          organizations: {
            atOrOverCapacity,
            nearCapacity
          }
        })
      }

      // Revenue estimates (based on seat pricing)
      if (type === 'revenue') {
        const orgs = await prisma.organization.findMany({
          where: {
            planId: { not: 'free' }
          },
          select: {
            id: true,
            name: true,
            planId: true,
            seatsAllowed: true,
            perSeatPriceCents: true,
            billingStatus: true
          }
        })

        const defaultPricing: Record<string, number> = {
          'pro': 1000, // $10/seat
          'enterprise': 2500 // $25/seat
        }

        const activeRevenue = orgs
          .filter(o => o.billingStatus === 'active')
          .reduce((sum, o) => {
            const planType = o.planId?.includes('pro') ? 'pro' : 'enterprise'
            const pricePerSeat = o.perSeatPriceCents || defaultPricing[planType] || 0
            return sum + (o.seatsAllowed * pricePerSeat)
          }, 0)

        const potentialRevenue = orgs.reduce((sum, o) => {
          const planType = o.planId?.includes('pro') ? 'pro' : 'enterprise'
          const pricePerSeat = o.perSeatPriceCents || defaultPricing[planType] || 0
          return sum + (o.seatsAllowed * pricePerSeat)
        }, 0)

        return res.status(200).json({
          monthlyRecurringRevenue: activeRevenue, // in cents
          potentialMRR: potentialRevenue,
          activeSubscriptions: orgs.filter(o => o.billingStatus === 'active').length,
          totalPaidOrgs: orgs.length,
          averageSeatsPerOrg: orgs.length > 0 
            ? Math.round(orgs.reduce((sum, o) => sum + o.seatsAllowed, 0) / orgs.length)
            : 0
        })
      }

      // Subscription health monitoring
      if (type === 'subscription-health') {
        const now = new Date()
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const orgs = await prisma.organization.findMany({
          where: {
            AND: [
              {
                OR: [
                  { billingInterval: 'monthly' },
                  { billingInterval: 'annual' }
                ]
              }
            ]
          },
          select: {
            id: true,
            name: true,
            slug: true,
            planId: true,
            billingStatus: true,
            billingInterval: true,
            currentPeriodEnd: true,
            canceledAt: true,
            cancelAtPeriodEnd: true,
            seatsAllowed: true,
            perSeatPriceCents: true,
            _count: {
              select: { members: true }
            },
            members: {
              where: { role: 'admin' },
              take: 1,
              select: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: { currentPeriodEnd: 'asc' }
        })

        const getDaysRemaining = (endDate: Date | null) => {
          if (!endDate) return null
          const diff = endDate.getTime() - now.getTime()
          return Math.ceil(diff / (1000 * 60 * 60 * 24))
        }

        const expiringIn7Days = orgs.filter(o => 
          o.currentPeriodEnd && 
          o.billingStatus === 'active' &&
          o.currentPeriodEnd >= now && 
          o.currentPeriodEnd <= in7Days
        ).map(o => ({
          ...o,
          daysRemaining: getDaysRemaining(o.currentPeriodEnd),
          adminContact: o.members[0]?.user
        }))

        const expiringIn14Days = orgs.filter(o => 
          o.currentPeriodEnd && 
          o.billingStatus === 'active' &&
          o.currentPeriodEnd > in7Days && 
          o.currentPeriodEnd <= in14Days
        ).map(o => ({
          ...o,
          daysRemaining: getDaysRemaining(o.currentPeriodEnd),
          adminContact: o.members[0]?.user
        }))

        const expiringIn30Days = orgs.filter(o => 
          o.currentPeriodEnd && 
          o.billingStatus === 'active' &&
          o.currentPeriodEnd > in14Days && 
          o.currentPeriodEnd <= in30Days
        ).map(o => ({
          ...o,
          daysRemaining: getDaysRemaining(o.currentPeriodEnd),
          adminContact: o.members[0]?.user
        }))

        const pastDue = orgs.filter(o => o.billingStatus === 'past_due').map(o => ({
          ...o,
          daysRemaining: getDaysRemaining(o.currentPeriodEnd),
          adminContact: o.members[0]?.user
        }))

        const canceledInGrace = orgs.filter(o => 
          o.billingStatus === 'canceled' && 
          o.cancelAtPeriodEnd && 
          o.currentPeriodEnd && 
          o.currentPeriodEnd > now
        ).map(o => ({
          ...o,
          daysRemaining: getDaysRemaining(o.currentPeriodEnd),
          adminContact: o.members[0]?.user
        }))

        const defaultPricing: Record<string, number> = {
          'pro_monthly': 1000,
          'pro_annual': 10000,
          'enterprise': 2500
        }

        const calculateRevenue = (org: any) => {
          const pricePerSeat = org.perSeatPriceCents || defaultPricing[org.planId] || 1000
          return org.seatsAllowed * pricePerSeat
        }

        const atRiskRevenue = [...pastDue, ...canceledInGrace].reduce((sum, o) => {
          return sum + calculateRevenue(o)
        }, 0)

        return res.status(200).json({
          expiringIn7Days: {
            count: expiringIn7Days.length,
            organizations: expiringIn7Days
          },
          expiringIn14Days: {
            count: expiringIn14Days.length,
            organizations: expiringIn14Days
          },
          expiringIn30Days: {
            count: expiringIn30Days.length,
            organizations: expiringIn30Days
          },
          pastDue: {
            count: pastDue.length,
            organizations: pastDue
          },
          canceledInGracePeriod: {
            count: canceledInGrace.length,
            organizations: canceledInGrace
          },
          atRiskRevenue: atRiskRevenue,
          summary: {
            totalAtRisk: pastDue.length + canceledInGrace.length,
            expiringNext7Days: expiringIn7Days.length,
            expiringNext30Days: expiringIn7Days.length + expiringIn14Days.length + expiringIn30Days.length
          }
        })
      }

      return res.status(400).json({ error: 'Invalid type parameter' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin metrics error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
