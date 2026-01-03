import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { attachmentId } = req.query
  if (!attachmentId || Array.isArray(attachmentId)) {
    return res.status(400).json({ error: 'Invalid attachment ID' })
  }

  if (req.method === 'DELETE') {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' })
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      // Soft delete - keep file for recovery, but mark as deleted
      await prisma.attachment.update({
        where: { id: attachmentId },
        data: {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: user?.id
        }
      })

      return res.status(200).json({ message: 'Attachment deleted successfully' })
    } catch (error) {
      console.error('Delete error:', error)
      return res.status(500).json({ error: 'Failed to delete attachment' })
    }
  }

  res.setHeader('Allow', ['DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
