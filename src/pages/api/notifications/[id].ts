import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid notification ID' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  // Verify the notification belongs to the current user
  const notification = await prisma.notification.findUnique({
    where: { id: String(id) }
  })

  if (!notification || notification.userId !== user.id) {
    return res.status(404).json({ error: 'Notification not found' })
  }

  if (req.method === 'PATCH') {
    // Mark notification as read
    const updated = await prisma.notification.update({
      where: { id: String(id) },
      data: { read: true }
    })

    return res.status(200).json(updated)
  }

  if (req.method === 'DELETE') {
    // Delete notification
    await prisma.notification.delete({
      where: { id: String(id) }
    })

    return res.status(200).json({ message: 'Notification deleted' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
