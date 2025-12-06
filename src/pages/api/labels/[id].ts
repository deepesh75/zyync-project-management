import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  if (req.method === 'DELETE') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })

    try {
      // Delete the label (this will also delete TaskLabel relations due to cascade)
      await prisma.label.delete({
        where: { id: String(id) }
      })
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('delete label error', err)
      return res.status(500).json({ error: 'Failed to delete label' })
    }
  }

  res.setHeader('Allow', ['DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
