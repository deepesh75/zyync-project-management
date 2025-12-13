import React from 'react'

interface Task {
  id: string
  title: string
  status: string
  priority?: string | null
  dueDate?: string | null
  assigneeId?: string | null
  description?: string
  [key: string]: any
}

interface TableViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  users: Array<any>
}

export default function TableView({ tasks, onTaskClick, users }: TableViewProps) {
  const getPriorityColor = (priority: string | null | undefined) => {
    const colors: Record<string, string> = {
      'high': '#ef4444',
      'medium': '#f59e0b',
      'low': '#3b82f6'
    }
    return colors[priority || 'low'] || '#6b7280'
  }

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return '—'
    const user = users.find(u => u.id === userId)
    return user ? (user.name || user.email) : 'Unknown'
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  }

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  return (
    <div style={{ padding: 24, background: 'var(--bg)', minHeight: '100vh', overflowX: 'auto' }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Table */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
          color: 'var(--text)'
        }}>
          <thead>
            <tr style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border)'
            }}>
              <th style={{
                padding: '16px 12px',
                textAlign: 'left',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: 200
              }}>
                Task
              </th>
              <th style={{
                padding: '16px 12px',
                textAlign: 'left',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: 100
              }}>
                Status
              </th>
              <th style={{
                padding: '16px 12px',
                textAlign: 'left',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: 80
              }}>
                Priority
              </th>
              <th style={{
                padding: '16px 12px',
                textAlign: 'left',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: 120
              }}>
                Assignee
              </th>
              <th style={{
                padding: '16px 12px',
                textAlign: 'left',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                minWidth: 100
              }}>
                Due Date
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task, idx) => (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  style={{
                    borderBottom: idx < tasks.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'var(--surface)'
                  }}
                  onMouseEnter={(e) => {
                    const row = e.currentTarget as HTMLTableRowElement
                    row.style.background = 'var(--bg-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    const row = e.currentTarget as HTMLTableRowElement
                    row.style.background = 'var(--surface)'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {task.title}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      whiteSpace: 'nowrap'
                    }}>
                      {task.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {task.priority && (
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: getPriorityColor(task.priority),
                        color: 'white',
                        whiteSpace: 'nowrap'
                      }}>
                        ● {task.priority}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getUserName(task.assigneeId)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      color: isOverdue(task.dueDate) ? '#ef4444' : 'var(--text-secondary)',
                      fontWeight: isOverdue(task.dueDate) ? 600 : 400
                    }}>
                      {isOverdue(task.dueDate) && '⚠️ '}
                      {formatDate(task.dueDate)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
