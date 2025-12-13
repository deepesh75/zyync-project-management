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
    <div style={{ 
      padding: 24, 
      background: 'var(--bg)', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      {/* Calendar Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        background: 'var(--surface)',
        padding: 20,
        borderRadius: 12,
        border: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          style={{
            padding: '10px 16px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85'
            e.currentTarget.style.transform = 'translateX(-2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'translateX(0)'
          }}
        >
          ← Previous
        </button>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
          {monthName}
        </h2>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          style={{
            padding: '10px 16px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85'
            e.currentTarget.style.transform = 'translateX(2px)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'translateX(0)'
          }}
        >
          Next →
        </button>
      </div>

      {/* Day names */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 8,
        marginBottom: 12,
        marginTop: 24
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
        gap: 8,
        gridAutoRows: 'minmax(100px, auto)',
        flex: 1
      }}>
        {/* Empty cells for days before month starts */}
        {emptyDays.map(i => (
          <div
            key={`empty-${i}`}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 8,
              border: '1px solid var(--border)',
              opacity: 0.3
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
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 6,
                fontSize: 14,
                minHeight: 20
              }}>
                {day}
              </div>
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 3
              }}>
                {dayTasks.slice(0, 3).map(task => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    style={{
                      padding: '4px 6px',
                      background: getPriorityColor(task.priority),
                      color: 'white',
                      border: 'none',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.85'
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
                {dayTasks.length > 3 && (
                  <div style={{
                    fontSize: 9,
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    padding: '2px 4px'
                  }}>
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
