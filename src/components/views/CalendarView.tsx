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

type ViewMode = 'month' | 'week' | 'day'

export default function CalendarView({ tasks, onTaskClick, users }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [viewMode, setViewMode] = React.useState<ViewMode>('month')
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [hoveredDay, setHoveredDay] = React.useState<number | null>(null)
  
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
    let dayTasks = tasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr))
    
    // Apply priority filter
    if (selectedFilter !== 'all') {
      dayTasks = dayTasks.filter(t => t.priority === selectedFilter)
    }
    
    return dayTasks
  }

  const getWeekDays = () => {
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      return day
    })
  }

  const isToday = (day: number) => {
    const today = new Date()
    return today.getDate() === day &&
           today.getMonth() === currentDate.getMonth() &&
           today.getFullYear() === currentDate.getFullYear()
  }

  const getTaskStats = () => {
    const allTasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const taskDate = new Date(t.dueDate)
      return taskDate.getMonth() === currentDate.getMonth() &&
             taskDate.getFullYear() === currentDate.getFullYear()
    })

    return {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'Done' || t.status === 'done').length,
      high: allTasks.filter(t => t.priority === 'high').length,
      overdue: allTasks.filter(t => {
        const due = new Date(t.dueDate!)
        return due < new Date() && t.status !== 'Done' && t.status !== 'done'
      }).length
    }
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

  return (
    <div style={{ 
      padding: 24, 
      background: 'var(--bg)', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      {/* Enhanced Calendar Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 16,
        marginBottom: 24,
        background: 'var(--surface)',
        padding: 24,
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Navigation Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
                } else if (viewMode === 'week') {
                  const newDate = new Date(currentDate)
                  newDate.setDate(newDate.getDate() - 7)
                  setCurrentDate(newDate)
                } else {
                  const newDate = new Date(currentDate)
                  newDate.setDate(newDate.getDate() - 1)
                  setCurrentDate(newDate)
                }
              }}
              style={{
                padding: '10px 16px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Previous
            </button>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              style={{
                padding: '10px 16px',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-light)'
                e.currentTarget.style.borderColor = 'var(--primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              Today
            </button>
            
            <button
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
                } else if (viewMode === 'week') {
                  const newDate = new Date(currentDate)
                  newDate.setDate(newDate.getDate() + 7)
                  setCurrentDate(newDate)
                } else {
                  const newDate = new Date(currentDate)
                  newDate.setDate(newDate.getDate() + 1)
                  setCurrentDate(newDate)
                }
              }}
              style={{
                padding: '10px 16px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            >
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {monthName}
          </h2>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10 }}>
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '8px 16px',
                  background: viewMode === mode ? 'var(--primary)' : 'transparent',
                  color: viewMode === mode ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            flex: 1,
            minWidth: 150,
            padding: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            color: 'white'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, marginBottom: 4 }}>Total Tasks</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.total}</div>
          </div>
          
          <div style={{
            flex: 1,
            minWidth: 150,
            padding: 16,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 12,
            color: 'white'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, marginBottom: 4 }}>Completed</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.completed}</div>
          </div>
          
          <div style={{
            flex: 1,
            minWidth: 150,
            padding: 16,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: 12,
            color: 'white'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, marginBottom: 4 }}>High Priority</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.high}</div>
          </div>
          
          <div style={{
            flex: 1,
            minWidth: 150,
            padding: 16,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: 12,
            color: 'white'
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, marginBottom: 4 }}>Overdue</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.overdue}</div>
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Filter:</span>
          {(['all', 'high', 'medium', 'low'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              style={{
                padding: '6px 14px',
                background: selectedFilter === filter ? 'var(--primary)' : 'var(--bg-secondary)',
                color: selectedFilter === filter ? 'white' : 'var(--text)',
                border: `1px solid ${selectedFilter === filter ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {filter === 'all' ? 'All Priorities' : `${filter} Priority`}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <>
          {/* Day names */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            marginBottom: 8
          }}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div
                key={day}
                style={{
                  padding: 12,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            gridAutoRows: 'minmax(120px, auto)',
            flex: 1
          }}>
            {/* Empty cells for days before month starts */}
            {emptyDays.map(i => (
              <div
                key={`empty-${i}`}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 10,
                  border: '1px dashed var(--border)',
                  opacity: 0.3
                }}
              />
            ))}

            {/* Days of month */}
            {days.map(day => {
              const dayTasks = getTasksForDate(day)
              const today = isToday(day)
              return (
                <div
                  key={day}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{
                    background: today 
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)'
                      : 'var(--surface)',
                    border: today 
                      ? '2px solid var(--primary)' 
                      : hoveredDay === day 
                        ? '2px solid var(--primary)' 
                        : '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    boxShadow: hoveredDay === day ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
                    transform: hoveredDay === day ? 'translateY(-2px)' : 'translateY(0)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <div style={{
                      fontWeight: today ? 800 : 700,
                      fontSize: today ? 18 : 14,
                      width: today ? 32 : 24,
                      height: today ? 32 : 24,
                      borderRadius: '50%',
                      background: today ? 'var(--primary)' : 'transparent',
                      color: today ? 'white' : 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {day}
                    </div>
                    {dayTasks.length > 0 && (
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        borderRadius: 10
                      }}>
                        {dayTasks.length}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    flex: 1, 
                    overflow: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4
                  }}>
                    {dayTasks.slice(0, 4).map(task => {
                      const assignee = users.find(u => u.id === task.assigneeId)
                      return (
                        <button
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onTaskClick(task)
                          }}
                          style={{
                            padding: '6px 8px',
                            background: getPriorityColor(task.priority),
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                          title={`${task.title}${assignee ? ` - ${assignee.name || assignee.email}` : ''}`}
                        >
                          <div style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: 'white',
                            flexShrink: 0
                          }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.title}
                          </span>
                          {assignee && (
                            <div style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: 'white',
                              color: getPriorityColor(task.priority),
                              fontSize: 9,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                        </button>
                      )
                    })}
                    {dayTasks.length > 4 && (
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text-secondary)',
                        fontWeight: 700,
                        padding: '4px 8px',
                        textAlign: 'center',
                        background: 'var(--bg-secondary)',
                        borderRadius: 4
                      }}>
                        +{dayTasks.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
            {getWeekDays().map((date, i) => {
              const dayTasks = tasks.filter(t => {
                if (!t.dueDate) return false
                const taskDate = new Date(t.dueDate)
                return taskDate.toDateString() === date.toDateString()
              })
              const today = date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={i}
                  style={{
                    padding: 16,
                    background: today 
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)'
                      : 'var(--surface)',
                    border: today ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 400
                  }}
                >
                  <div style={{ marginBottom: 12, textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 4
                    }}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: today ? 'var(--primary)' : 'var(--text)'
                    }}>
                      {date.getDate()}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dayTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        style={{
                          padding: '10px 12px',
                          background: getPriorityColor(task.priority),
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {task.title}
                      </button>
                    ))}
                  </div>
                  
                  {dayTasks.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: 20,
                      color: 'var(--text-secondary)',
                      fontSize: 12
                    }}>
                      No tasks
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: 20, 
            fontWeight: 700,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 800
            }}>
              {currentDate.getDate()}
            </div>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.filter(t => {
              if (!t.dueDate) return false
              const taskDate = new Date(t.dueDate)
              return taskDate.toDateString() === currentDate.toDateString()
            }).map(task => {
              const assignee = users.find(u => u.id === task.assigneeId)
              return (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-secondary)',
                    border: `2px solid ${getPriorityColor(task.priority)}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: getPriorityColor(task.priority),
                    flexShrink: 0
                  }} />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: 16, 
                      fontWeight: 700, 
                      color: 'var(--text)',
                      marginBottom: 4
                    }}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div style={{ 
                        fontSize: 13, 
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5
                      }}>
                        {task.description}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{
                      padding: '4px 10px',
                      background: getPriorityColor(task.priority),
                      color: 'white',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {task.priority || 'normal'}
                    </span>
                    
                    {assignee && (
                      <div style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          color: 'white',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {(assignee.name || assignee.email).charAt(0).toUpperCase()}
                        </div>
                        {assignee.name || assignee.email}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
            
            {tasks.filter(t => {
              if (!t.dueDate) return false
              const taskDate = new Date(t.dueDate)
              return taskDate.toDateString() === currentDate.toDateString()
            }).length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 60,
                color: 'var(--text-secondary)',
                fontSize: 14
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                No tasks scheduled for this day
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
