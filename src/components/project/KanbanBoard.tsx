import React, { memo } from 'react'
import TaskCard from './TaskCard'

interface KanbanBoardProps {
  columns: Array<{ id: string; name: string }>
  tasks: Array<any>
  columnTaskInputs: Record<string, string>
  onColumnTaskInputChange: (columnId: string, value: string) => void
  onCreateTask: (e: React.KeyboardEvent, columnId: string) => void
  onAddTemplateTask: (columnId: string) => void
  onDragStart: (e: React.DragEvent, taskId: string, taskTitle: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, columnId: string) => void
  onDrop: (e: React.DragEvent, columnId: string) => void
  onDragEnter: (e: React.DragEvent, columnId: string) => void
  onDragLeave: (e: React.DragEvent, columnId: string) => void
  onDragEnterTask: (e: React.DragEvent, taskId: string) => void
  onDragLeaveTask: (e: React.DragEvent, taskId: string) => void
  draggingTaskId: string | null
  dragOverColumn: string | null
  dragOverTaskId: string | null
  onTaskClick: (task: any) => void
  onEditColumn: (columnId: string) => void
  onDeleteColumn: (columnId: string) => void
  editingColumnId: string | null
  onUpdateColumnName: (columnId: string, name: string) => void
  onSaveColumns: () => Promise<void>
  onAddingColumn: () => void
  addingColumn: boolean
  newColumnName: string
  onNewColumnNameChange: (value: string) => void
  onAddColumn: () => void
  session: any
  onEditingColumns: () => void
}

function KanbanBoard({
  columns,
  tasks,
  columnTaskInputs,
  onColumnTaskInputChange,
  onCreateTask,
  onAddTemplateTask,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragEnterTask,
  onDragLeaveTask,
  draggingTaskId,
  dragOverColumn,
  dragOverTaskId,
  onTaskClick,
  editingColumnId,
  onUpdateColumnName,
  onSaveColumns,
  onAddingColumn,
  addingColumn,
  newColumnName,
  onNewColumnNameChange,
  onAddColumn,
  session,
  onEditingColumns
}: KanbanBoardProps) {
  const filterTasksByColumn = (columnId: string) => {
    return tasks.filter((t) => t.status === columnId)
  }

  return (
    <div className="kanban" style={{ gap: 16, height: '100%', display: 'flex', overflowX: 'auto', paddingBottom: 16 }}>
      {columns.map((col) => {
        const columnTasks = filterTasksByColumn(col.id)
        return (
          <section 
            key={col.id} 
            onDragOver={(e) => onDragOver(e, col.id)}
            onDrop={(e) => onDrop(e, col.id)}
            onDragEnter={(e) => onDragEnter(e, col.id)}
            onDragLeave={(e) => { if (e.currentTarget === e.target) onDragLeave(e, col.id) }}
            style={{ 
              flex: '0 0 280px',
              minWidth: 280,
              display: 'flex',
              flexDirection: 'column',
              background: dragOverColumn === col.id 
                ? 'linear-gradient(135deg, var(--primary-light) 0%, rgba(99, 102, 241, 0.1) 100%)' 
                : 'var(--surface)',
              padding: 12,
              borderRadius: 14,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: dragOverColumn === col.id ? '2px solid var(--primary)' : '2px solid var(--border)',
              boxShadow: dragOverColumn === col.id ? 'var(--shadow-xl)' : 'var(--shadow-md)',
              height: 'calc(100% - 76px)'
            }}
          >
            {/* Column Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
              {editingColumnId === col.id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                  <input
                    autoFocus
                    value={col.name}
                    onChange={(e) => onUpdateColumnName(col.id, e.target.value)}
                    onBlur={async () => {
                      onEditingColumns()
                      await onSaveColumns()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onEditingColumns()
                        onSaveColumns()
                      }
                      if (e.key === 'Escape') {
                        onEditingColumns()
                      }
                    }}
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      border: '2px solid var(--primary)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      flex: 1
                    }}
                  />
                </div>
              ) : (
                <>
                  <h2 style={{ 
                    fontSize: 13, 
                    margin: 0, 
                    color: 'var(--text)', 
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                    minWidth: 0
                  }}>
                    <span style={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>{col.name}</span>
                    <span style={{
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      padding: '4px 10px',
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      minWidth: 28,
                      textAlign: 'center'
                    }}>{columnTasks.length}</span>
                  </h2>
                </>
              )}
            </div>

            {/* Task List */}
            <ul 
              onDragOver={(e) => onDragOver(e, col.id)} 
              onDrop={(e) => onDrop(e, col.id)} 
              style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0,
                overflowY: 'auto',
                flex: 1
              }}
            >
              {columnTasks.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDragEnter={(e) => onDragEnterTask(e, task.id)}
                  onDragLeave={(e) => onDragLeaveTask(e, task.id)}
                  isDragging={draggingTaskId === task.id}
                  isDragOverThis={dragOverTaskId === task.id}
                  onTaskClick={onTaskClick}
                />
              ))}

              {draggingTaskId && dragOverColumn === col.id && !dragOverTaskId && (
                <li key={`placeholder-end-${col.id}`} style={{ background: '#fafafa', padding: 12, marginBottom: 8, borderRadius: 4, border: '2px dashed #ddd', minHeight: 48 }} />
              )}
            </ul>
            
            {/* Add Task Form */}
            {session && (
              <div style={{ 
                marginTop: 10,
                padding: 0,
                background: 'transparent',
                flexShrink: 0,
                display: 'flex',
                gap: 8,
                alignItems: 'center'
              }}>
                <input 
                  placeholder="+ Add task" 
                  value={columnTaskInputs[col.id] || ''} 
                  onChange={(e) => onColumnTaskInputChange(col.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (columnTaskInputs[col.id] || '').trim()) {
                      e.preventDefault()
                      onCreateTask(e as any, col.id)
                    }
                  }}
                  style={{ 
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px dashed var(--border)',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderStyle = 'solid'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderStyle = 'dashed'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                />
                <button
                  onClick={() => onAddTemplateTask(col.id)}
                  title="Create from template"
                  style={{
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px dashed var(--border)',
                    borderRadius: 6,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 40,
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderStyle = 'solid'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                    e.currentTarget.style.color = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderStyle = 'dashed'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  📋
                </button>
              </div>
            )}
          </section>
        )
      })}
      
      {/* Add Column Button */}
      <section 
        style={{ 
          flex: '0 0 320px',
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 76px)'
        }}
      >
        {addingColumn ? (
          <div style={{
            background: 'var(--surface)',
            padding: 16,
            borderRadius: 12,
            border: '2px solid var(--primary)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input 
                autoFocus
                placeholder="Column name" 
                value={newColumnName} 
                onChange={(e) => onNewColumnNameChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onAddColumn()}
                style={{ 
                  flex: 1, 
                  padding: '10px 12px', 
                  borderRadius: 6, 
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 14,
                  color: 'var(--text)'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={onAddColumn}
                style={{ 
                  flex: 1,
                  padding: '10px 16px', 
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#059669'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#10b981'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Add
              </button>
              <button 
                onClick={() => {
                  onNewColumnNameChange('')
                  onAddingColumn()
                }}
                style={{ 
                  padding: '10px 16px', 
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onAddingColumn}
            style={{
              borderRadius: 12,
              padding: '16px',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              border: '2px dashed var(--border)',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)'
              e.currentTarget.style.color = 'var(--primary)'
              e.currentTarget.style.background = 'var(--primary-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.background = 'var(--column-bg)'
            }}
          >
            <span style={{ fontSize: 24 }}>+</span>
            <span>Add Column</span>
          </button>
        )}
      </section>
    </div>
  )
}

export default memo(KanbanBoard)
