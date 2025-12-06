import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  if (req.method === 'GET') {
    // Get all notifications for the current user
    const { unreadOnly } = req.query

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly === 'true' ? { read: false } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50 notifications
    })

    return res.status(200).json(notifications)
  }

  if (req.method === 'POST') {
    // Create a new notification (typically called by backend operations)
    const { userId, type, title, message, link } = req.body

    if (!userId || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null
      }
    })

    return res.status(201).json(notification)
  }

  if (req.method === 'PATCH') {
    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false
      },
      data: {
        read: true
      }
    })

    return res.status(200).json({ message: 'All notifications marked as read' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
