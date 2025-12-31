import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '../../../../lib/prisma'
import { checkSeatAvailability, getSeatPricing, syncSeatsUsed } from '../../../../lib/seats'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Organization ID required' })
  }

  // Verify user is an admin of this organization
  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: id,
      user: { email: session.user.email },
      role: 'admin'
    }
  })

  if (!membership) {
    return res.status(403).json({ error: 'Only organization admins can manage seats' })
  }

  try {
    if (req.method === 'GET') {
      // Get seat information
      const availability = await checkSeatAvailability(id)
      const pricing = await getSeatPricing(id)

      return res.status(200).json({
        ...availability,
        ...pricing
      })
    }

    if (req.method === 'POST') {
      // Sync seat count
      await syncSeatsUsed(id)
      const availability = await checkSeatAvailability(id)

      return res.status(200).json({
        message: 'Seat count synced',
        ...availability
      })
    }

    if (req.method === 'PATCH') {
      // Update seats allowed (requires PayPal subscription update)
      const { seatsAllowed } = req.body

      if (!seatsAllowed || typeof seatsAllowed !== 'number' || seatsAllowed < 1) {
        return res.status(400).json({ error: 'Valid seatsAllowed number required' })
      }

      const org = await prisma.organization.findUnique({
        where: { id },
        select: { seatsUsed: true, paypalSubscriptionId: true }
      })

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' })
      }

      if (seatsAllowed < org.seatsUsed) {
        return res.status(400).json({
          error: `Cannot reduce seats below current usage (${org.seatsUsed} seats in use)`
        })
      }

      // Update seats allowed
      // Note: In production, this should also update the PayPal subscription quantity
      // via PayPal API before updating the database
      await prisma.organization.update({
        where: { id },
        data: { seatsAllowed }
      })

      const availability = await checkSeatAvailability(id)

      return res.status(200).json({
        message: 'Seats updated successfully',
        ...availability
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Seats API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
