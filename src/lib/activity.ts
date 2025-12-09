import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type ActivityAction =
  | 'created'
  | 'moved'
  | 'updated_title'
  | 'updated_description'
  | 'updated_priority'
  | 'updated_due_date'
  | 'added_label'
  | 'removed_label'
  | 'added_member'
  | 'removed_member'
  | 'commented'
  | 'added_subtask'
  | 'completed_subtask'
  | 'added_attachment'
  | 'deleted'

interface LogActivityParams {
  taskId: string
  userId?: string
  action: ActivityAction
  field?: string
  oldValue?: string
  newValue?: string
  metadata?: any
}

export async function logActivity({
  taskId,
  userId,
  action,
  field,
  oldValue,
  newValue,
  metadata
}: LogActivityParams) {
  try {
    const activity = await prisma.activity.create({
      data: {
        taskId,
        userId: userId || null,
        action,
        field: field || null,
        oldValue: oldValue || null,
        newValue: newValue || null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })
    return activity
  } catch (error) {
    console.error('Failed to log activity:', error)
    return null
  }
}

export async function getTaskActivities(taskId: string) {
  try {
    const activities = await prisma.activity.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return activities
  } catch (error) {
    console.error('Failed to fetch activities:', error)
    return []
  }
}

// Helper to format activity messages for display
export function formatActivityMessage(activity: any): string {
  const userName = activity.user?.name || activity.user?.email || 'Someone'
  
  switch (activity.action) {
    case 'created':
      return `${userName} created this task`
    
    case 'moved':
      return `${userName} moved this from ${activity.oldValue} to ${activity.newValue}`
    
    case 'updated_title':
      return `${userName} changed the title to "${activity.newValue}"`
    
    case 'updated_description':
      return `${userName} ${activity.oldValue ? 'updated' : 'added'} the description`
    
    case 'updated_priority':
      return `${userName} changed priority from ${activity.oldValue || 'none'} to ${activity.newValue}`
    
    case 'updated_due_date':
      if (!activity.oldValue && activity.newValue) {
        return `${userName} set due date to ${new Date(activity.newValue).toLocaleDateString()}`
      } else if (activity.oldValue && !activity.newValue) {
        return `${userName} removed the due date`
      } else {
        return `${userName} changed due date to ${new Date(activity.newValue).toLocaleDateString()}`
      }
    
    case 'added_label':
      return `${userName} added label "${activity.newValue}"`
    
    case 'removed_label':
      return `${userName} removed label "${activity.oldValue}"`
    
    case 'added_member':
      return `${userName} added ${activity.newValue} to this task`
    
    case 'removed_member':
      return `${userName} removed ${activity.oldValue} from this task`
    
    case 'commented':
      return `${userName} commented`
    
    case 'added_subtask':
      return `${userName} added subtask "${activity.newValue}"`
    
    case 'completed_subtask':
      return `${userName} ${activity.newValue === 'true' ? 'completed' : 'uncompleted'} subtask "${activity.oldValue}"`
    
    case 'added_attachment':
      return `${userName} attached ${activity.newValue}`
    
    case 'deleted':
      return `${userName} deleted this task`
    
    default:
      return `${userName} updated this task`
  }
}
