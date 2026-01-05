import React from 'react'

interface Task {
  id: string
  title: string
  dueDate?: string | null
  status: string
  priority?: string | null
  assigneeId?: string | null
  createdAt?: string
  [key: string]: any
}

interface TimelineViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  users: Array<any>
}

type TimelineScale = 'day' | 'week' | 'month'
type GroupBy = 'none' | 'assignee' | 'priority' | 'status'

export default function TimelineView({ tasks, onTaskClick, users }: TimelineViewProps) {
  const [timelineScale, setTimelineScale] = React.useState<TimelineScale>('week')
  const [groupBy, setGroupBy] = React.useState<GroupBy>('none')
  const [showCompleted, setShowCompleted] = React.useState(true)
  const [hoveredTask, setHoveredTask] = React.useState<string | null>(null)
  // Filter tasks with due dates and sort by due date
  const filteredTasks = tasks
    .filter(t => showCompleted || (t.status !== 'Done' && t.status !== 'done'))
    .filter(t => t.dueDate)
    .sort((a, b) => {
      const dateA = new Date(a.dueDate || '').getTime()
      const dateB = new Date(b.dueDate || '').getTime()
      return dateA - dateB
    })

  const tasksWithoutDates = tasks.filter(t => !t.dueDate)

  const getTaskDuration = (task: Task): number => {
    // Calculate duration from created date to due date
    if (!task.dueDate) return 1
    const created = task.createdAt ? new Date(task.createdAt) : new Date()
    const due = new Date(task.dueDate)
    const days = Math.ceil((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, days)
  }

  const getProgressPercentage = (task: Task): number => {
    if (task.status === 'Done' || task.status === 'done') return 100
    if (task.status === 'In Progress' || task.status === 'in_progress') return 50
    return 0
  }

  const isOverdue = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  const getTaskStats = () => {
    const total = filteredTasks.length
    const completed = filteredTasks.filter(t => t.status === 'Done' || t.status === 'done').length
    const overdue = filteredTasks.filter(t => isOverdue(t.dueDate)).length
    const inProgress = filteredTasks.filter(t => t.status === 'In Progress' || t.status === 'in_progress').length
    
    return { total, completed, overdue, inProgress }
  }

  const stats = getTaskStats()

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
    if (filteredTasks.length === 0) {
      const today = new Date()
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
      }
    }

    const dates = filteredTasks.map(t => {
      const dueDate = new Date(t.dueDate || '')
      const createdDate = t.createdAt ? new Date(t.createdAt) : dueDate
      return [createdDate, dueDate]
    }).flat()

    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))
    
    // Add buffer based on scale
    if (timelineScale === 'day') {
      start.setDate(start.getDate() - 3)
      end.setDate(end.getDate() + 3)
    } else if (timelineScale === 'week') {
      start.setDate(start.getDate() - 7)
      end.setDate(end.getDate() + 7)
    } else {
      start.setMonth(start.getMonth() - 1)
      end.setMonth(end.getMonth() + 1)
    }
    
    return { start, end }
  }

  const groupTasks = () => {
    if (groupBy === 'none') {
      return [{ name: 'All Tasks', tasks: filteredTasks }]
    } else if (groupBy === 'assignee') {
      const groups: Record<string, Task[]> = {}
      filteredTasks.forEach(task => {
        const key = task.assigneeId || 'unassigned'
        if (!groups[key]) groups[key] = []
        groups[key].push(task)
      })
      return Object.entries(groups).map(([id, tasks]) => ({
        name: id === 'unassigned' ? 'Unassigned' : getUserName(id),
        tasks
      }))
    } else if (groupBy === 'priority') {
      const groups: Record<string, Task[]> = { high: [], medium: [], low: [] }
      filteredTasks.forEach(task => {
        const priority = task.priority || 'low'
        if (groups[priority]) groups[priority].push(task)
      })
      return Object.entries(groups)
        .filter(([_, tasks]) => tasks.length > 0)
        .map(([priority, tasks]) => ({
          name: priority.charAt(0).toUpperCase() + priority.slice(1) + ' Priority',
          tasks
        }))
    } else {
      const groups: Record<string, Task[]> = {}
      filteredTasks.forEach(task => {
        const status = task.status || 'To Do'
        if (!groups[status]) groups[status] = []
        groups[status].push(task)
      })
      return Object.entries(groups).map(([status, tasks]) => ({
        name: status,
        tasks
      }))
    }
  }

  const taskGroups = groupTasks()

  const { start: rangeStart, end: rangeEnd } = getDateRange()
  const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
  
  const getColumnWidth = () => {
    if (timelineScale === 'day') return 60
    if (timelineScale === 'week') return 40
    return 30
  }

  const columnWidth = getColumnWidth()
  const visibleDays = Math.min(totalDays, timelineScale === 'day' ? 60 : timelineScale === 'week' ? 90 : 180)

  return (
    <div style={{ 
      padding: 24, 
      background: 'var(--bg)', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Enhanced Header */}
      <div style={{
        background: 'var(--surface)',
        padding: 24,
        borderRadius: 16,
        border: '1px solid var(--border)',
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Timeline View
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              Gantt-style project timeline with task dependencies
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Scale Toggle */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--bg-secondary)', padding: 4, borderRadius: 8 }}>
              {(['day', 'week', 'month'] as TimelineScale[]).map(scale => (
                <button
                  key={scale}
                  onClick={() => setTimelineScale(scale)}
                  style={{
                    padding: '6px 14px',
                    background: timelineScale === scale ? 'var(--primary)' : 'transparent',
                    color: timelineScale === scale ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {scale}
                </button>
              ))}
            </div>

            {/* Group By */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              style={{
                padding: '8px 12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="none">No Grouping</option>
              <option value="assignee">Group by Assignee</option>
              <option value="priority">Group by Priority</option>
              <option value="status">Group by Status</option>
            </select>

            {/* Show Completed Toggle */}
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              style={{
                padding: '8px 14px',
                background: showCompleted ? 'var(--primary-light)' : 'var(--bg-secondary)',
                color: showCompleted ? 'var(--primary)' : 'var(--text-secondary)',
                border: `1px solid ${showCompleted ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showCompleted ? (
                  <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                ) : (
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                )}
              </svg>
              Completed
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            flex: 1,
            padding: 12,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 10,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>Total Tasks</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.total}</div>
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: 12,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 10,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ✓
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>Completed</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.completed}</div>
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: 12,
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: 10,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>In Progress</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.inProgress}</div>
            </div>
          </div>

          <div style={{
            flex: 1,
            padding: 12,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: 10,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ⚠
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>Overdue</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.overdue}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Timeline/Gantt Chart */}
      <div style={{ 
        background: 'var(--surface)', 
        borderRadius: 16, 
        border: '1px solid var(--border)', 
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Task List Column */}
          <div style={{
            width: 280,
            flexShrink: 0,
            borderRight: '2px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-secondary)'
          }}>
            <div style={{
              padding: 16,
              fontWeight: 700,
              fontSize: 14,
              borderBottom: '2px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              position: 'sticky',
              top: 0,
              zIndex: 2
            }}>
              Task Name
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {taskGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  {groupBy !== 'none' && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: 13,
                      borderBottom: '1px solid var(--border)',
                      position: 'sticky',
                      top: 54,
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/>
                      </svg>
                      {group.name}
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        padding: '2px 8px',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: 10,
                        fontWeight: 700
                      }}>
                        {group.tasks.length}
                      </span>
                    </div>
                  )}
                  {group.tasks.map((task, idx) => {
                    const assignee = users.find(u => u.id === task.assigneeId)
                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                        style={{
                          padding: 16,
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: hoveredTask === task.id ? 'var(--surface)' : 'transparent',
                          transform: hoveredTask === task.id ? 'translateX(4px)' : 'translateX(0)'
                        }}
                      >
                        <div style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: 'var(--text)',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: getPriorityColor(task.priority),
                            flexShrink: 0
                          }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.title}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          {assignee && (
                            <>
                              <div style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                color: 'white',
                                fontSize: 9,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                              </div>
                              <span>{assignee.name || assignee.email}</span>
                            </>
                          )}
                          {isOverdue(task.dueDate) && (
                            <span style={{
                              marginLeft: 'auto',
                              padding: '2px 6px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 700
                            }}>
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Grid */}
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {/* Timeline Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              background: 'var(--surface)',
              borderBottom: '2px solid var(--border)'
            }}>
              <div style={{ display: 'flex', minWidth: 'min-content' }}>
                {Array.from({ length: visibleDays }, (_, i) => {
                  const date = new Date(rangeStart)
                  date.setDate(date.getDate() + i)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  
                  return (
                    <div
                      key={i}
                      style={{
                        width: columnWidth,
                        flexShrink: 0,
                        padding: '8px 4px',
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRight: i % 7 === 6 ? '1px solid var(--border)' : '1px solid rgba(0, 0, 0, 0.05)',
                        background: isToday 
                          ? 'var(--primary)' 
                          : isWeekend 
                            ? 'var(--bg-secondary)' 
                            : 'var(--surface)',
                        color: isToday ? 'white' : isWeekend ? 'var(--text-secondary)' : 'var(--text)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      <div style={{ fontSize: 9, opacity: 0.8, marginBottom: 2 }}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: timelineScale === 'day' ? 14 : 11 }}>
                        {formatDate(date.toISOString())}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timeline Grid Content */}
            <div style={{ position: 'relative', minWidth: 'min-content' }}>
              {/* Today Marker */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: Math.floor((new Date().getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) * columnWidth,
                width: 2,
                background: 'var(--primary)',
                zIndex: 1,
                pointerEvents: 'none'
              }} />

              {/* Grid Background */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex' }}>
                {Array.from({ length: visibleDays }, (_, i) => {
                  const date = new Date(rangeStart)
                  date.setDate(date.getDate() + i)
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  
                  return (
                    <div
                      key={i}
                      style={{
                        width: columnWidth,
                        flexShrink: 0,
                        borderRight: i % 7 === 6 ? '1px solid var(--border)' : '1px solid rgba(0, 0, 0, 0.03)',
                        background: isWeekend ? 'var(--bg-secondary)' : 'transparent'
                      }}
                    />
                  )
                })}
              </div>

              {/* Task Bars */}
              <div style={{ position: 'relative' }}>
                {taskGroups.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    {groupBy !== 'none' && (
                      <div style={{
                        height: 41,
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--bg-secondary)'
                      }} />
                    )}
                    {group.tasks.map((task, idx) => {
                      const dueDate = new Date(task.dueDate || '')
                      const createdDate = task.createdAt ? new Date(task.createdAt) : new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)
                      const startDay = Math.floor((createdDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
                      const duration = getTaskDuration(task)
                      const progress = getProgressPercentage(task)
                      const overdue = isOverdue(task.dueDate)

                      return (
                        <div
                          key={task.id}
                          style={{
                            height: 65,
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: Math.max(0, startDay) * columnWidth,
                            position: 'relative'
                          }}
                        >
                          <div
                            onClick={() => onTaskClick(task)}
                            onMouseEnter={() => setHoveredTask(task.id)}
                            onMouseLeave={() => setHoveredTask(null)}
                            style={{
                              minWidth: Math.max(columnWidth, duration * columnWidth),
                              height: 36,
                              borderRadius: 8,
                              background: `linear-gradient(135deg, ${getPriorityColor(task.priority)} 0%, ${getPriorityColor(task.priority)}dd 100%)`,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              position: 'relative',
                              overflow: 'hidden',
                              boxShadow: hoveredTask === task.id 
                                ? '0 4px 12px rgba(0, 0, 0, 0.2)' 
                                : '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transform: hoveredTask === task.id ? 'scale(1.05)' : 'scale(1)',
                              border: overdue ? '2px solid #dc2626' : 'none'
                            }}
                          >
                            {/* Progress Bar */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: `${progress}%`,
                              background: 'rgba(255, 255, 255, 0.3)',
                              transition: 'width 0.3s'
                            }} />

                            {/* Task Info */}
                            <div style={{
                              position: 'relative',
                              padding: '0 12px',
                              display: 'flex',
                              alignItems: 'center',
                              height: '100%',
                              gap: 8
                            }}>
                              <span style={{
                                color: 'white',
                                fontSize: 12,
                                fontWeight: 700,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                              }}>
                                {task.title}
                              </span>
                              {progress > 0 && (
                                <span style={{
                                  marginLeft: 'auto',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: 'white',
                                  padding: '2px 6px',
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  borderRadius: 4
                                }}>
                                  {progress}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
