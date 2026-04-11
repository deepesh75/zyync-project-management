import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid project ID' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return res.status(401).json({ error: 'User not found' })

  // Check if user owns the project
  const project = await prisma.project.findUnique({
    where: { id: String(id) }
  })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  if (project.ownerId !== user.id) {
    return res.status(403).json({ error: 'Only project owner can manage members' })
  }

  // GET - List all members with access to this project
  if (req.method === 'GET') {
    try {
      const members = await prisma.projectMember.findMany({
        where: { projectId: String(id) },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { addedAt: 'desc' }
      })

      return res.status(200).json(members)
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch members' })
    }
  }

  // POST - Add a user to the project
  if (req.method === 'POST') {
    try {
      const { email } = req.body

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' })
      }

      // Find the user to add
      const memberToAdd = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (!memberToAdd) {
        return res.status(404).json({ error: 'User not found' })
      }

      if (memberToAdd.id === user.id) {
        return res.status(400).json({ error: 'You are already the project owner' })
      }

      // Check if already a member
      const existing = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: String(id),
            userId: memberToAdd.id
          }
        }
      })

      if (existing) {
        return res.status(400).json({ error: 'User is already a member of this project' })
      }

      // Add the member
      const member = await prisma.projectMember.create({
        data: {
          projectId: String(id),
          userId: memberToAdd.id,
          addedAt: new Date()
        },
        include: { user: { select: { id: true, name: true, email: true } } }
      })

      return res.status(201).json(member)
    } catch (error) {
      console.error('Failed to add member:', error)
      return res.status(500).json({ error: 'Failed to add member' })
    }
  }

  // DELETE - Remove a user from the project
  if (req.method === 'DELETE') {
    try {
      const { userId } = req.body

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' })
      }

      if (userId === user.id) {
        return res.status(400).json({ error: 'You cannot remove yourself as project owner' })
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: String(id),
            userId
          }
        }
      })

      return res.status(200).json({ message: 'Member removed' })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Member not found' })
      }
      console.error('Failed to remove member:', error)
      return res.status(500).json({ error: 'Failed to remove member' })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  return res.status(405).json({ error: 'Method not allowed' })
}
