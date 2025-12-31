import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { invalidateCache } from '../../../../../lib/redis'
import { syncSeatsUsed } from '../../../../../lib/seats'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id, memberId } = req.query
  if (!id || Array.isArray(id) || !memberId || Array.isArray(memberId)) {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return res.status(404).json({ error: 'User not found' })

  // Check if user is admin of this organization
  const userMembership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: id,
        userId: user.id
      }
    }
  })

  if (!userMembership || userMembership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can manage members' })
  }

  // Prevent self-removal
  const memberToManage = await prisma.organizationMember.findUnique({
    where: { id: memberId }
  })

  if (!memberToManage || memberToManage.organizationId !== id) {
    return res.status(404).json({ error: 'Member not found' })
  }

  if (memberToManage.userId === user.id) {
    return res.status(400).json({ error: 'You cannot remove yourself from the organization' })
  }

  if (req.method === 'PATCH') {
    const { role } = req.body
    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role }
    })

    // Invalidate cache
    await invalidateCache(`organization:${id}`)

    return res.status(200).json({
      success: true,
      member: updated
    })
  }

  if (req.method === 'DELETE') {
    await prisma.organizationMember.delete({
      where: { id: memberId }
    })

    // Sync seats after member removal
    try {
      await syncSeatsUsed(id)
    } catch (err) {
      console.warn('Failed to sync seats after member removal (non-fatal)', err)
    }

    // Invalidate cache
    await invalidateCache(`organization:${id}`)

    return res.status(200).json({
      success: true,
      message: 'Member removed from organization'
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
