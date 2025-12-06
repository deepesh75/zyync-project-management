import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } })
  res.status(200).json(users)
}
