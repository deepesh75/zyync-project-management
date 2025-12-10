import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { notifyMention, notifyComment } from '../../../../lib/notifications'
import { logActivity } from '../../../../lib/activity'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' })

  if (req.method === 'GET') {
    const comments = await prisma.comment.findMany({ where: { taskId: String(id) }, include: { author: true }, orderBy: { createdAt: 'asc' } })
    return res.status(200).json(comments)
  }

  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions)
    if (!session || !session.user?.email) return res.status(401).json({ error: 'Unauthorized' })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    
    const { body } = req.body
    if (!body) return res.status(400).json({ error: 'body is required' })
    
    // Get task details for notifications
    const task = await prisma.task.findUnique({
      where: { id: String(id) },
      select: { 
        id: true, 
        title: true, 
        projectId: true,
        members: {
          select: {
            userId: true
          }
        }
      }
    })
    
    const comment = await prisma.comment.create({ 
      data: { body, taskId: String(id), authorId: user.id },
      include: { author: true }
    })
    
    // Log comment activity
    await logActivity({
      taskId: String(id),
      userId: user.id,
      action: 'commented'
    })
    
    if (task) {
      // Extract mentions from comment body (matches @Name or @FirstName LastName)
      const mentionRegex = /@(\w+(?:\s+\w+)?)/g
      const mentions = body.match(mentionRegex)
      
      if (mentions) {
        const allUsers = await prisma.user.findMany()
        
        for (const mention of mentions) {
          const mentionedName = mention.slice(1).trim()
          const mentionedUser = allUsers.find(u => 
            (u.name && u.name.toLowerCase() === mentionedName.toLowerCase()) || 
            (u.email && u.email.toLowerCase() === mentionedName.toLowerCase())
          )
          
          // Send notification (allow self-mention for testing)
          if (mentionedUser) {
            await notifyMention(
              mentionedUser.id,
              String(id),
              task.title,
              user.name || user.email,
              body,
              task.projectId
            )
          }
        }
      }
      
      // Notify task members about new comment (except the commenter)
      for (const member of task.members) {
        if (member.userId !== user.id) {
          await notifyComment(
            member.userId,
            String(id),
            task.title,
            user.name || user.email
          )
        }
      }
    }
    
    return res.status(201).json(comment)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
