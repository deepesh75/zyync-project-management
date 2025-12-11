import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import { prisma } from './prisma'

export async function requireOrgAdmin(req: NextApiRequest, res: NextApiResponse, orgId: string) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || !session.user?.email) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return null
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: user.id
      }
    }
  })

  if (!membership || membership.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can perform this action' })
    return null
  }

  return { user, membership }
}
