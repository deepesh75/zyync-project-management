import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })

    const { name, color } = req.body
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Name is required' })

    try {
      const label = await prisma.label.create({
        data: {
          name: name.trim(),
          color: color && typeof color === 'string' ? color : null,
          project: { connect: { id: String(id) } }
        }
      })
      return res.status(201).json(label)
    } catch (err) {
      console.error('create label error', err)
      return res.status(500).json({ error: 'Failed to create label' })
    }
  }

  res.setHeader('Allow', ['POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
