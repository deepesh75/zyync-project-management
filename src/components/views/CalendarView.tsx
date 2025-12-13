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

interface CalendarViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  users: Array<any>
}

export default function CalendarView({ tasks, onTaskClick, users }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  const getTasksForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr))
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

  return (
    <div style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Calendar Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 32,
        background: 'var(--surface)',
        padding: 20,
        borderRadius: 12,
        border: '1px solid var(--border)'
      }}>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          style={{
            padding: '8px 16px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          ← Previous
        </button>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
          {monthName}
        </h2>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          style={{
            padding: '8px 16px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Next →
        </button>
      </div>

      {/* Day names */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 12,
        marginBottom: 12
      }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            style={{
              padding: 12,
              textAlign: 'center',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 12
      }}>
        {/* Empty cells for days before month starts */}
        {emptyDays.map(i => (
          <div
            key={`empty-${i}`}
            style={{
              minHeight: 120,
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              opacity: 0.5
            }}
          />
        ))}

        {/* Days of month */}
        {days.map(day => {
          const dayTasks = getTasksForDate(day)
          return (
            <div
              key={day}
              style={{
                minHeight: 120,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 8,
                fontSize: 14
              }}>
                {day}
              </div>
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={{
                      padding: '6px 8px',
                      background: getPriorityColor(task.priority),
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.8'
                      e.currentTarget.style.transform = 'scale(1.02)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
