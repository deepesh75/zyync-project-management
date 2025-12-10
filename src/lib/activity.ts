import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ActivityAction = 
  | 'created' 
  | 'updated' 
  | 'moved' 
  | 'commented' 
  | 'assigned' 
  | 'unassigned'
  | 'labeled' 
  | 'unlabeled'
  | 'attachment_added' 
  | 'attachment_removed'
  | 'member_added'
  | 'member_removed'
  | 'subtask_added'
  | 'subtask_completed'
  | 'subtask_uncompleted'
  | 'due_date_set'
  | 'due_date_removed'
  | 'priority_changed'
  | 'archived'
  | 'unarchived'
  | 'duplicated'

interface CreateActivityParams {
  taskId: string
  userId?: string
  action: ActivityAction
  field?: string
  oldValue?: string
  newValue?: string
}

export async function logActivity(params: CreateActivityParams) {
  try {
    const activity = await prisma.activity.create({
      data: {
        taskId: params.taskId,
        userId: params.userId,
        action: params.action,
        field: params.field || null,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null
      }
    })
    return activity
  } catch (error) {
    console.error('Error logging activity:', error)
    return null
  }
}

// Helper function to format activity for display
export function formatActivityMessage(activity: any): string {
  const userName = activity.user?.name || activity.user?.email || 'Someone'
  
  switch (activity.action) {
    case 'created':
      return `${userName} created this task`
    
    case 'moved':
      return `${userName} moved this from "${activity.oldValue}" to "${activity.newValue}"`
    
    case 'updated':
      if (activity.field === 'title') {
        return `${userName} changed the title from "${activity.oldValue}" to "${activity.newValue}"`
      }
      if (activity.field === 'description') {
        return `${userName} updated the description`
      }
      return `${userName} updated ${activity.field}`
    
    case 'assigned':
      return `${userName} assigned this to ${activity.newValue}`
    
    case 'unassigned':
      return `${userName} removed ${activity.oldValue} from assignee`
    
    case 'labeled':
      return `${userName} added label "${activity.newValue}"`
    
    case 'unlabeled':
      return `${userName} removed label "${activity.oldValue}"`
    
    case 'attachment_added':
      return `${userName} attached ${activity.newValue}`
    
    case 'attachment_removed':
      return `${userName} removed attachment ${activity.oldValue}`
    
    case 'member_added':
      return `${userName} added ${activity.newValue} to this task`
    
    case 'member_removed':
      return `${userName} removed ${activity.oldValue} from this task`
    
    case 'subtask_added':
      return `${userName} added subtask "${activity.newValue}"`
    
    case 'subtask_completed':
      return `${userName} completed subtask "${activity.newValue}"`
    
    case 'subtask_uncompleted':
      return `${userName} uncompleted subtask "${activity.newValue}"`
    
    case 'due_date_set':
      return `${userName} set due date to ${new Date(activity.newValue!).toLocaleDateString()}`
    
    case 'due_date_removed':
      return `${userName} removed the due date`
    
    case 'priority_changed':
      return `${userName} changed priority from "${activity.oldValue}" to "${activity.newValue}"`
    
    case 'commented':
      return `${userName} commented`
    
    case 'archived':
      return `${userName} archived this task`
    
    case 'unarchived':
      return `${userName} unarchived this task`
    
    case 'duplicated':
      return `${userName} duplicated this task`
    
    default:
      return `${userName} performed an action`
  }
}
