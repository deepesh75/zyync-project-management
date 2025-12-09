import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { getTaskActivities } from '../../../../lib/activity'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  if (req.method === 'GET') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const activities = await getTaskActivities(String(id))
    return res.status(200).json(activities)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
