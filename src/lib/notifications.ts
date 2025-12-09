import { PrismaClient } from '@prisma/client'
import { sendMentionEmail } from './email'

const prisma = new PrismaClient()

type NotificationType = 'task_assigned' | 'mentioned' | 'comment' | 'due_soon' | 'task_updated' | 'member_added'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null
      }
    })
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

export async function notifyTaskAssignment(taskId: string, taskTitle: string, assigneeId: string, assignedBy?: string) {
  return createNotification({
    userId: assigneeId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `${assignedBy ? assignedBy + ' assigned you to' : 'You were assigned to'} "${taskTitle}"`,
    link: `/tasks/${taskId}`
  })
}

export async function notifyMention(userId: string, taskId: string, taskTitle: string, mentionedBy: string, commentBody?: string, projectId?: string) {
  const notification = await createNotification({
    userId,
    type: 'mentioned',
    title: 'You were mentioned',
    message: `${mentionedBy} mentioned you in "${taskTitle}"`,
    link: projectId ? `/projects/${projectId}` : `/tasks/${taskId}`
  })
  
  // Send email notification if RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY && notification) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      })
      
      if (user?.email) {
        console.log(`Sending mention email to ${user.email} for task ${taskTitle}`)
        // Use production URL for task links - never use localhost
        const baseUrl = process.env.VERCEL_ENV === 'production' 
          ? 'https://zyync.com' 
          : (process.env.NEXTAUTH_URL || 'http://localhost:3000')
        
        const result = await sendMentionEmail({
          to: user.email,
          toName: user.name || user.email.split('@')[0],
          mentionedBy,
          taskTitle,
          taskLink: projectId ? `${baseUrl}/projects/${projectId}` : `${baseUrl}/tasks/${taskId}`,
          commentBody: commentBody || 'Click to view the comment'
        })
        console.log('Email send result:', result)
      } else {
        console.log(`No email found for user ${userId}`)
      }
    } catch (error) {
      console.error('Failed to send mention email:', error)
    }
  } else {
    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured - mention email not sent')
    }
  }
  
  return notification
}

export async function notifyComment(userId: string, taskId: string, taskTitle: string, commenterName: string) {
  return createNotification({
    userId,
    type: 'comment',
    title: 'New Comment',
    message: `${commenterName} commented on "${taskTitle}"`,
    link: `/tasks/${taskId}`
  })
}

export async function notifyDueSoon(userId: string, taskId: string, taskTitle: string, dueDate: Date) {
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  
  return createNotification({
    userId,
    type: 'due_soon',
    title: 'Task Due Soon',
    message: `"${taskTitle}" is due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
    link: `/tasks/${taskId}`
  })
}

export async function notifyTaskUpdate(userId: string, taskId: string, taskTitle: string, updateType: string, updatedBy: string) {
  return createNotification({
    userId,
    type: 'task_updated',
    title: 'Task Updated',
    message: `${updatedBy} ${updateType} "${taskTitle}"`,
    link: `/tasks/${taskId}`
  })
}

export async function notifyMemberAdded(userId: string, taskId: string, taskTitle: string, addedBy: string) {
  return createNotification({
    userId,
    type: 'member_added',
    title: 'Added to Task',
    message: `${addedBy} added you to "${taskTitle}"`,
    link: `/tasks/${taskId}`
  })
}
