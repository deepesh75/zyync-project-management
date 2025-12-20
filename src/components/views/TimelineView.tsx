import React from 'react'

interface Task {
  id: string
  title: string
  dueDate?: string | null
  status: string
  priority?: string | null
  assigneeId?: string | null
  [key: string]: any
}

interface TimelineViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  users: Array<any>
}

export default function TimelineView({ tasks, onTaskClick, users }: TimelineViewProps) {
  // Filter tasks with due dates and sort by due date
  const tasksWithDates = tasks
    .filter(t => t.dueDate)
    .sort((a, b) => {
      const dateA = new Date(a.dueDate || '').getTime()
      const dateB = new Date(b.dueDate || '').getTime()
      return dateA - dateB
    })

  const tasksWithoutDates = tasks.filter(t => !t.dueDate)

  const getTaskDuration = (dueDate: string | null | undefined): number => {
    if (!dueDate) return 1
    // For now, return a fixed duration of 1 day. In a real app, you'd track start date too
    return 1
  }

  const getProgressPercentage = (startDate: string | null | undefined, dueDate: string | null | undefined): number => {
    // Placeholder: return 0% for now
    // In a real implementation, track start date and current progress
    return 0
  }

  const getPriorityColor = (priority: string | null | undefined) => {
    const colors: Record<string, string> = {
      'high': '#ef4444',
      'medium': '#f59e0b',
      'low': '#3b82f6'
    }
    return colors[priority || 'low'] || '#6b7280'
  }

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return 'Unassigned'
    const user = users.find(u => u.id === userId)
    return user ? (user.name || user.email) : 'Unknown'
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDateRange = () => {
    if (tasksWithDates.length === 0) {
      const today = new Date()
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
      }
    }

    const dates = tasksWithDates.map(t => new Date(t.dueDate || ''))
    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))
    
    // Add 1 week buffer
    start.setDate(start.getDate() - 7)
    end.setDate(end.getDate() + 7)
    
    return { start, end }
  }

  const { start: rangeStart, end: rangeEnd } = getDateRange()
  const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div style={{ padding: 24, background: 'var(--bg)', height: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <h2 style={{ margin: '0 0 24px 0', fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
        Timeline View
      </h2>

      {/* Timeline */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'auto', flex: 1 }}>
        {/* Header with dates */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', minWidth: 'min-content', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              width: 200,
              flexShrink: 0,
              padding: 16,
              background: 'var(--bg-secondary)',
              fontWeight: 700,
              fontSize: 14,
              borderRight: '1px solid var(--border)'
            }}>
              Task
            </div>
            <div style={{ display: 'flex', flex: 1 }}>
              {Array.from({ length: Math.min(totalDays, 90) }, (_, i) => {
                const date = new Date(rangeStart)
                date.setDate(date.getDate() + i)
                const isToday = date.toDateString() === new Date().toDateString()
                
                return (
                  <div
                    key={i}
                    style={{
                      width: 40,
                      flexShrink: 0,
                      padding: 8,
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRight: '1px solid var(--border)',
                      background: isToday ? 'var(--primary-light)' : 'transparent',
                      color: isToday ? 'var(--primary)' : 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {formatDate(date.toISOString())}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Task rows */}
          <div>
            {tasksWithDates.map((task, idx) => {
              const taskDate = new Date(task.dueDate || '')
              const dayOffset = Math.floor((taskDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
              const dayWidth = 40

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  style={{
                    display: 'flex',
                    borderBottom: idx < tasksWithDates.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{
                    width: 200,
                    flexShrink: 0,
                    padding: 16,
                    borderRight: '1px solid var(--border)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {getUserName(task.assigneeId)}
                    </div>
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: dayOffset * dayWidth,
                    minHeight: 60
                  }}>
                    <div
                      style={{
                        height: 32,
                        minWidth: dayWidth,
                        background: getPriorityColor(task.priority),
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={task.title}
                    >
                      {formatDate(task.dueDate)}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Tasks without due dates */}
            {tasksWithoutDates.length > 0 && (
              <>
                <div style={{
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  fontWeight: 700,
                  fontSize: 12,
                  borderTop: '2px solid var(--border)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  No Due Date
                </div>
                {tasksWithoutDates.map((task, idx) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 16,
                      borderBottom: idx < tasksWithoutDates.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {task.title}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
