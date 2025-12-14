import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { invalidateCache } from '../../../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id, invitationId } = req.query
  if (!id || Array.isArray(id) || !invitationId || Array.isArray(invitationId)) {
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
    return res.status(403).json({ error: 'Only admins can manage invitations' })
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId }
  })

  if (!invitation || invitation.organizationId !== id) {
    return res.status(404).json({ error: 'Invitation not found' })
  }

  if (req.method === 'DELETE') {
    await prisma.invitation.delete({
      where: { id: invitationId }
    })

    // Invalidate cache
    await invalidateCache(`organization:${id}`)

    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled'
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
