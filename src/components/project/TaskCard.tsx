import React, { memo } from 'react'

interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string
    status: string
    priority?: string | null
    assigneeId?: string | null
    dueDate?: string | null
    labels?: Array<any>
    members?: Array<any>
    subtasks?: Array<any>
    coverColor?: string
  }
  onDragStart: (e: React.DragEvent, taskId: string, taskTitle: string) => void
  onDragEnd: () => void
  onDragEnter: (e: React.DragEvent, taskId: string) => void
  onDragLeave: (e: React.DragEvent, taskId: string) => void
  isDragging: boolean
  isDragOverThis: boolean
  onTaskClick: (task: any) => void
}

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  isDragging,
  isDragOverThis,
  onTaskClick
}: TaskCardProps) {
  return (
    <>
      {isDragOverThis && (
        <li style={{ 
          background: 'linear-gradient(135deg, var(--primary-light) 0%, rgba(99, 102, 241, 0.1) 100%)', 
          padding: 12, 
          marginBottom: 10, 
          borderRadius: 10, 
          minHeight: 60,
          border: '2px dashed var(--primary)',
          animation: 'pulse 1.5s ease-in-out infinite',
          boxShadow: '0 0 20px rgba(79, 70, 229, 0.2)'
        }} />
      )}

      <li
        data-task-id={task.id}
        draggable
        onDragStart={(e) => onDragStart(e, task.id, task.title)}
        onDragEnd={onDragEnd}
        onDragEnter={(e) => onDragEnter(e, task.id)}
        onDragLeave={(e) => onDragLeave(e, task.id)}
        className="task-card"
        style={{
          background: 'var(--card-bg)',
          padding: 12,
          marginBottom: 10,
          borderRadius: 10,
          boxShadow: isDragging ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderLeft: '3px solid var(--primary)',
          opacity: isDragging ? 0.4 : 1,
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          border: '1px solid var(--border)',
          borderLeftWidth: '3px',
          borderLeftColor: 'var(--primary)',
          overflow: 'hidden',
          transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'scale(1) rotate(0deg)'
        }}
      >
        {/* Cover color bar */}
        {task.coverColor && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: (() => {
              const colorMap: Record<string, string> = {
                red: '#ef4444',
                orange: '#f97316',
                yellow: '#eab308',
                green: '#22c55e',
                blue: '#3b82f6',
                purple: '#a855f7',
                pink: '#ec4899',
                gray: '#6b7280'
              }
              return colorMap[task.coverColor!] || 'transparent'
            })(),
            borderTopLeftRadius: 9,
            borderTopRightRadius: 9
          }} />
        )}
        <button className="card-edit-icon" onClick={(e) => { e.stopPropagation(); onTaskClick(task) }} title="Edit task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Task title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ 
              cursor: 'pointer', 
              fontSize: 13, 
              fontWeight: 600,
              color: 'var(--text)',
              lineHeight: 1.4,
              wordBreak: 'break-word',
              flex: 1
            }} onClick={() => onTaskClick(task)}>{task.title}</strong>
          </div>
          
          {/* Member avatars */}
          {task.members && task.members.length > 0 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {task.members?.slice(0, 3).map((m: any) => (
                <div key={m.userId} style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, border: '2px solid var(--surface)', flexShrink: 0 }} title={m.user?.name || m.user?.email}>
                  {(m.user?.name || m.user?.email || '').split(' ').map((s: string) => s[0]).join('').slice(0,2).toUpperCase()}
                </div>
              ))}
              {task.members?.length > 3 && (
                <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, border: '2px solid var(--surface)', flexShrink: 0 }}>+{task.members.length - 3}</div>
              )}
            </div>
          )}
          
          {/** labels and priority */}
          {(task.labels && task.labels.length > 0) || task.priority ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Priority indicator */}
              {task.priority && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 5,
                  background: (() => {
                    if (task.priority === 'high') return 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                    if (task.priority === 'low') return 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                    return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                  })(),
                  color: (() => {
                    if (task.priority === 'high') return '#991b1b'
                    if (task.priority === 'low') return '#065f46'
                    return '#92400e'
                  })(),
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'inline-block',
                  boxShadow: (() => {
                    if (task.priority === 'high') return '0 1px 4px rgba(239, 68, 68, 0.15)'
                    if (task.priority === 'low') return '0 1px 4px rgba(16, 185, 129, 0.15)'
                    return '0 1px 4px rgba(245, 158, 11, 0.15)'
                  })(),
                  border: (() => {
                    if (task.priority === 'high') return '1px solid #fca5a5'
                    if (task.priority === 'low') return '1px solid #6ee7b7'
                    return '1px solid #fcd34d'
                  })(),
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.3px'
                }}>
                  {task.priority}
                </span>
              )}
              
              {/* Labels */}
              {task.labels && task.labels.length > 0 && task.labels.map((tl: any) => {
                const label = tl.label || tl
                const hex = label.color || '#6b7280'
                const r = parseInt(hex.slice(1, 3), 16)
                const g = parseInt(hex.slice(3, 5), 16)
                const b = parseInt(hex.slice(5, 7), 16)
                const brightness = (r * 299 + g * 587 + b * 114) / 1000
                const textColor = brightness > 155 ? '#111827' : '#ffffff'
                
                return (
                  <span key={label.id} style={{ 
                    background: label.color || '#6b7280', 
                    color: textColor,
                    padding: '3px 8px', 
                    borderRadius: 4, 
                    fontSize: 11,
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    border: `1px solid ${brightness > 200 ? 'rgba(0,0,0,0.1)' : 'transparent'}`,
                    whiteSpace: 'nowrap'
                  }}>{label.name}</span>
                )
              })}
            </div>
          ) : null}
          
          {task.description && (
            <div style={{ 
              fontSize: 12, 
              color: 'var(--text-secondary)', 
              lineHeight: 1.5,
              marginTop: 4,
              wordBreak: 'break-word'
            }}>{task.description}</div>
          )}

          {/* Subtasks progress */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div style={{ 
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span style={{ 
                fontSize: 11, 
                color: 'var(--text-secondary)',
                fontWeight: 500
              }}>
                {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
              </span>
              <div style={{
                flex: 1,
                height: 4,
                background: 'var(--bg-secondary)',
                borderRadius: 2,
                overflow: 'hidden',
                maxWidth: 60
              }}>
                <div style={{
                  height: '100%',
                  background: 'var(--primary)',
                  width: `${(task.subtasks.filter((s: any) => s.completed).length / task.subtasks.length) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
          
          {/* Due Date */}
          {task.dueDate && (
            <div style={{ 
              marginTop: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              background: (() => {
                const due = new Date(task.dueDate)
                const today = new Date()
                const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                if (diffDays < 0) return '#fee2e2'
                if (diffDays <= 2) return '#fef3c7'
                return '#dbeafe'
              })(),
              color: (() => {
                const due = new Date(task.dueDate)
                const today = new Date()
                const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                if (diffDays < 0) return '#991b1b'
                if (diffDays <= 2) return '#92400e'
                return '#1e40af'
              })()
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {(() => {
                const due = new Date(task.dueDate)
                const today = new Date()
                const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                if (diffDays < 0) return ' (Overdue)'
                if (diffDays === 0) return ' (Today)'
                if (diffDays === 1) return ' (Tomorrow)'
                return ''
              })()}
            </div>
          )}
        </div>
      </li>
    </>
  )
}

export default memo(TaskCard)
