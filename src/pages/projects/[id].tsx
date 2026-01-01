import React, { useEffect, useState, lazy, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useSession, signIn } from 'next-auth/react'
import { useProject } from '../../hooks/useProject'
import matchesFilter from '../../lib/filter'
import { formatActivityMessage } from '../../lib/activity'
import Navbar from '../../components/Navbar'
import CalendarView from '../../components/views/CalendarView'
import TableView from '../../components/views/TableView'
import TimelineView from '../../components/views/TimelineView'
import { useFilterPresets } from '../../hooks/useFilterPresets'
import { useWorkflows } from '../../hooks/useWorkflows'
import ProjectHeader from '../../components/project/ProjectHeader'
import KanbanBoard from '../../components/project/KanbanBoard'
import { FeatureGate } from '../../components/FeatureGate'
import { useFeatureAccess } from '../../lib/permissions'

// Lazy load heavy modals and components
const AdvancedFilterUI = dynamic(() => import('../../components/AdvancedFilterUI'), { ssr: false })
const WorkflowUI = dynamic(() => import('../../components/WorkflowUI').then(mod => ({ default: mod.WorkflowUI })), { ssr: false })
const TaskTemplateSelector = dynamic(() => import('../../components/TaskTemplateSelector'), { ssr: false })
const ManageTemplates = dynamic(() => import('../../components/ManageTemplates'), { ssr: false })

function getBackgroundStyle(bg: string): string {
  const backgrounds: Record<string, string> = {
    'gradient-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'gradient-blue': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'gradient-sunset': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'gradient-forest': 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
    'gradient-rose': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'gradient-night': 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
    'gradient-ocean': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'gradient-mint': 'linear-gradient(135deg, #0ba360 0%, #2d8a7f 100%)',
    'gradient-coral': 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
    'gradient-gold': 'linear-gradient(135deg, #f5a623 0%, #f7b731 100%)',
    'gradient-lavender': 'linear-gradient(135deg, #b993f3 0%, #9b7ebd 100%)',
    'gradient-peach': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'solid-light': '#f8f9fa',
    'solid-dark': '#1a1a1a',
    'solid-white': '#ffffff',
    'solid-cream': '#fffef5',
    'solid-gray': '#f3f4f6',
  }
  return backgrounds[bg] || backgrounds['gradient-purple']
}

function getHeaderColorForBackground(bg: string): { text: string; background: string } {
  const darkBackgrounds = ['solid-dark', 'gradient-night', 'gradient-forest']
  const lightBackgrounds = ['solid-light', 'solid-white', 'solid-cream', 'gradient-peach']
  
  if (darkBackgrounds.includes(bg)) {
    return { text: '#ffffff', background: 'rgba(0, 0, 0, 0.3)' }
  }
  if (lightBackgrounds.includes(bg)) {
    return { text: '#1a1a1a', background: 'rgba(255, 255, 255, 0.7)' }
  }
  // For colorful gradients, use white text with semi-transparent dark background
  return { text: '#ffffff', background: 'rgba(0, 0, 0, 0.2)' }
}

type Task = {
  id: string
  title: string
  description?: string
  status: string
  priority?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  labels?: Array<any>
}

export default function ProjectPage() {
  const router = useRouter()
  const { id } = router.query
  const { data: session } = useSession()
  
  const { project, isLoading, isError, mutate } = useProject(typeof id === 'string' ? id : undefined)
  const loading = isLoading

  // form state for creating a task
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Array<any>>([])
  const [commentBody, setCommentBody] = useState('')
  const [users, setUsers] = useState<Array<any>>([])
  const [boardUsers, setBoardUsers] = useState<Array<any>>([])
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#6b7280')
  const [searchTerm, setSearchTerm] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [editingColumns, setEditingColumns] = useState(false)
  const [columns, setColumns] = useState<Array<{ id: string; name: string }>>([])
  const [newColumnName, setNewColumnName] = useState('')
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [originalColumns, setOriginalColumns] = useState<Array<{ id: string; name: string }>>([])
  const [columnTaskInputs, setColumnTaskInputs] = useState<Record<string, string>>({})
  const [subtasks, setSubtasks] = useState<Array<any>>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [attachments, setAttachments] = useState<Array<any>>([])
  const [uploading, setUploading] = useState(false)
  const [activities, setActivities] = useState<Array<any>>([])
  
  // Template states
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showManageTemplates, setShowManageTemplates] = useState(false)
  const [showTemplatesForColumn, setShowTemplatesForColumn] = useState<string | null>(null)
  
  // View state
  const [currentView, setCurrentView] = useState<'kanban' | 'calendar' | 'table' | 'timeline'>('kanban')
  
  // Advanced filter states
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    assignee: null as string | null,
    priority: null as string | null,
    label: null as string | null,
    status: null as string | null,
    search: null as string | null,
    dueDate: null as { from?: string; to?: string; isOverdue?: boolean } | null
  })
  const { presets, loaded: presetsLoaded, savePreset, deletePreset } = useFilterPresets()
  const canUseAdvancedFilters = useFeatureAccess('advanced_filters')
  
  // Filter states
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [quickFilter, setQuickFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [showLabelsModal, setShowLabelsModal] = useState(false)
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showWorkflows, setShowWorkflows] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [showFiltersMenu, setShowFiltersMenu] = useState(false)
  const { workflows, loadWorkflows, saveWorkflow, updateWorkflow, deleteWorkflow } = useWorkflows(id as string || '')
  
  useEffect(() => {
    if (!project) return
    // Only update columns from project data if we're not currently editing columns
    // This prevents the local column additions from being overwritten
    if (!editingColumns) {
      // Parse columns from project or use defaults
      let parsedColumns: Array<{ id: string; name: string }>
      if (project.columns) {
        try {
          parsedColumns = JSON.parse(project.columns)
        } catch {
          parsedColumns = [{ id: 'todo', name: 'Todo' }, { id: 'in-progress', name: 'In Progress' }, { id: 'done', name: 'Done' }]
        }
      } else {
        parsedColumns = [{ id: 'todo', name: 'Todo' }, { id: 'in-progress', name: 'In Progress' }, { id: 'done', name: 'Done' }]
      }
      setColumns(parsedColumns)
      setOriginalColumns(JSON.parse(JSON.stringify(parsedColumns))) // Deep copy for comparison
    }
  }, [project, editingColumns])

  useEffect(() => {
    // fetch users for assignee selection on the board
    fetch('/api/users')
      .then((r) => r.json())
      .then((u) => setBoardUsers(u))
      .catch(() => setBoardUsers([]))
  }, [])

  useEffect(() => {
    if (id) {
      loadWorkflows()
    }
  }, [id, loadWorkflows])

  async function moveTask(taskId: string, toStatus: string) {
    if (!project) return
    
    // Find the task being moved
    const movedTask = project.tasks.find((t: any) => t.id === taskId)
    if (!movedTask) return
    
    // Optimistic update - instant UI
    const optimisticProject = {
      ...project,
      tasks: project.tasks.map((t: any) =>
        t.id === taskId ? { ...t, status: toStatus } : t
      ),
    }
    mutate(optimisticProject, false)
    
    // Update server in background
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status: toStatus }) 
      })
      
      if (response.ok) {
        // Execute workflows on status change
        if (workflows && workflows.length > 0) {
          try {
            const context = {
              taskId,
              projectId: id as string,
              oldStatus: movedTask.status,
              newStatus: toStatus,
            }
            
            // Dynamically import executor to avoid server-side issues
            const { executeWorkflows, logWorkflowExecution } = await import('../../services/workflowExecutor')
            const results = await executeWorkflows(workflows, context, {
              id: taskId,
              title: movedTask.title,
              labels: movedTask.labels || []
            })
            logWorkflowExecution(results, context)
          } catch (err) {
            console.error('Workflow execution error:', err)
            // Don't block the task update on workflow errors
          }
        }
      }
      
      // Revalidate to sync with server
      mutate()
    } catch (err) {
      console.error('moveTask error', err)
      // Revert on error
      mutate()
    }
  }

  // Drag-and-drop state and handlers (with preview + placeholder)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  function clearDragState() {
    setDraggingTaskId(null)
    setDragOverTaskId(null)
    setDragOverColumn(null)
    // remove any lingering drag preview element
    try {
      const existing = document.querySelector('[data-drag-preview]')
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing)
    } catch (err) {
      // ignore
    }
  }

  function onDragStart(e: React.DragEvent, taskId: string, title: string) {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingTaskId(taskId)
    console.debug('dragstart', taskId, title)
    // create a simple drag preview element
    const preview = document.createElement('div')
    preview.setAttribute('data-drag-preview', '1')
    preview.style.padding = '8px 12px'
    preview.style.background = 'var(--card-bg)'
    preview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    preview.style.borderRadius = '6px'
    preview.style.fontWeight = '700'
    preview.style.fontSize = '13px'
    preview.style.position = 'absolute'
    preview.style.top = '-9999px'
    preview.textContent = title
    document.body.appendChild(preview)
    // set drag image with the preview
    try {
      e.dataTransfer.setDragImage(preview, 20, 10)
    } catch (err) {
      // ignore if not supported
    }
    // keep the preview until drag end; it will be cleaned up in clearDragState
  }

  function onDragOver(e: React.DragEvent, col?: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (col) {
      // when hovering the column itself, clear any hovered task
      setDragOverColumn(col)
      setDragOverTaskId(null)
    }
  }

  function onDragEnterTask(e: React.DragEvent, taskId: string) {
    e.preventDefault()
    // when hovering a specific task, clear the column hover
    setDragOverTaskId(taskId)
    setDragOverColumn(null)
  }

  function onDragLeaveTask(e: React.DragEvent, taskId: string) {
    e.preventDefault()
    // only clear if leaving the same task
    setDragOverTaskId((cur) => (cur === taskId ? null : cur))
  }

  async function onDrop(e: React.DragEvent, toStatus: string) {
    e.preventDefault()
    // Prefer dataTransfer value, but fall back to React state in case it's cleared on drop
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId
    console.debug('drop', { taskId, toStatus, dragOverColumn, dragOverTaskId })
    if (!taskId) {
      clearDragState()
      return
    }
    await moveTask(taskId, toStatus)
    clearDragState()
  }

  async function createTask(e?: React.FormEvent, columnId?: string) {
    if (e) e.preventDefault()
    const taskTitle = columnId ? (columnTaskInputs[columnId] || '') : newTitle
    if (!taskTitle.trim() || !project) return
    setCreating(true)
    const status = columnId || columns[0]?.id
    
    const res = await fetch('/api/tasks', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ title: taskTitle, description: newDescription, projectId: id, status }) 
    })
    
    if (res.ok) {
      const newTask = await res.json()
      // Optimistic update - add task to cache
      mutate({
        ...project,
        tasks: [...project.tasks, newTask]
      }, false)
    }
    
    if (columnId) {
      setColumnTaskInputs({ ...columnTaskInputs, [columnId]: '' })
    } else {
      setNewTitle('')
      setNewDescription('')
    }
    
    setCreating(false)
    // Revalidate in background
    mutate()
  }

  async function createTaskFromTemplate(template: any, columnId?: string) {
    if (!project) return
    setCreating(true)
    
    const status = columnId || columns[0]?.id
    const taskData: any = {
      title: template?.name || 'New Task',
      description: template?.description || '',
      projectId: id,
      status,
      priority: template?.priority || 'medium'
    }

    // If has cover color, set it
    if (template?.coverColor) {
      taskData.coverColor = template.coverColor
    }

    // If has due offset, set due date
    if (template?.dueOffsetDays) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + template.dueOffsetDays)
      taskData.dueDate = dueDate.toISOString()
    }

    // If has default assignee, set it
    if (template?.defaultAssigneeId) {
      taskData.assigneeId = template.defaultAssigneeId
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })

    if (res.ok) {
      const newTask = await res.json()
      
      // Add labels if template has them
      if (template?.labelIds && template.labelIds.length > 0) {
        await Promise.all(
          template.labelIds.map((labelId: string) =>
            fetch(`/api/tasks/${newTask.id}/labels/${labelId}`, { method: 'POST' })
          )
        )
      }

      // Add members if template has them
      if (template?.defaultMembers && template.defaultMembers.length > 0) {
        await Promise.all(
          template.defaultMembers.map((userId: string) =>
            fetch(`/api/tasks/${newTask.id}/members/${userId}`, { method: 'POST' })
          )
        )
      }

      // Optimistic update
      mutate({
        ...project,
        tasks: [...project.tasks, newTask]
      }, false)
    }

    setCreating(false)
    setShowTemplateSelector(false)
    mutate()
  }

  async function openTask(t: Task) {
    setSelectedTask(t)
    // fetch comments, users, subtasks, attachments, and activities
    const [cRes, uRes, sRes, aRes, actRes] = await Promise.all([
      fetch(`/api/tasks/${t.id}/comments`), 
      fetch('/api/users'),
      fetch(`/api/tasks/${t.id}/subtasks`),
      fetch(`/api/tasks/${t.id}/attachments`),
      fetch(`/api/tasks/${t.id}/activities`)
    ])
    const cJson = await cRes.json().catch(() => [])
    const uJson = await uRes.json().catch(() => [])
    const sJson = await sRes.json().catch(() => [])
    const aJson = await aRes.json().catch(() => [])
    const actJson = await actRes.json().catch(() => [])
    setComments(cJson)
    setUsers(uJson)
    setSubtasks(sJson)
    setAttachments(aJson)
    setActivities(actJson)
  }

  function handleCommentInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    const pos = e.target.selectionStart || 0
    setCommentBody(value)
    setCursorPosition(pos)

    // Check if @ was typed
    const textBeforeCursor = value.slice(0, pos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1 && pos > lastAtIndex) {
      const searchText = textBeforeCursor.slice(lastAtIndex + 1)
      if (!searchText.includes(' ')) {
        setMentionSearch(searchText.toLowerCase())
        setShowMentions(true)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  function insertMention(user: any) {
    const textBeforeCursor = commentBody.slice(0, cursorPosition)
    const textAfterCursor = commentBody.slice(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    const newText = commentBody.slice(0, lastAtIndex) + `@${user.name || user.email} ` + textAfterCursor
    setCommentBody(newText)
    setShowMentions(false)
  }

  async function postComment(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!selectedTask || !commentBody) return
    const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: commentBody }) })
    if (res.ok) {
      const newC = await res.json()
      setComments((s) => [...s, newC])
      setCommentBody('')
      setShowMentions(false)
    }
  }

  function renderCommentBody(body: string) {
    // Highlight @mentions in comments (matches @Name or @FirstName LastName)
    const parts = body.split(/(@\w+(?:\s+\w+)?)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} style={{ color: '#6366f1', fontWeight: 600 }}>{part}</span>
      }
      return part
    })
  }

  async function addSubtask(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!selectedTask || !newSubtaskTitle.trim()) return

    const res = await fetch(`/api/tasks/${selectedTask.id}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSubtaskTitle.trim() })
    })

    if (res.ok) {
      const newSubtask = await res.json()
      setSubtasks([...subtasks, newSubtask])
      setNewSubtaskTitle('')
    }
  }

  async function toggleSubtask(subtaskId: string, completed: boolean) {
    const res = await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    })

    if (res.ok) {
      setSubtasks(subtasks.map(s => s.id === subtaskId ? { ...s, completed } : s))
    }
  }

  function filterTasks(tasks: Task[]) {
    return tasks.filter(task => {
      // Advanced filters
      if (advancedFilters.search) {
        const searchLower = advancedFilters.search.toLowerCase()
        const titleMatch = task.title.toLowerCase().includes(searchLower)
        const descMatch = task.description?.toLowerCase().includes(searchLower)
        if (!titleMatch && !descMatch) return false
      }

      if (advancedFilters.assignee) {
        if (advancedFilters.assignee === 'unassigned' && task.assigneeId) return false
        if (advancedFilters.assignee !== 'unassigned' && task.assigneeId !== advancedFilters.assignee) return false
      }

      if (advancedFilters.priority && task.priority !== advancedFilters.priority) return false

      if (advancedFilters.label) {
        const hasLabel = (task.labels || []).some(l => l.id === advancedFilters.label)
        if (!hasLabel) return false
      }

      if (advancedFilters.status && task.status !== advancedFilters.status) return false

      // Legacy filters (for backwards compatibility)
      // Assignee filter
      if (assigneeFilter) {
        if (assigneeFilter === 'unassigned' && task.assigneeId) return false
        if (assigneeFilter !== 'unassigned' && task.assigneeId !== assigneeFilter) return false
      }

      // Priority filter
      if (priorityFilter && task.priority !== priorityFilter) {
        return false
      }

      // Label filter
      if (labelFilter) {
        const hasLabel = task.labels?.some((tl: any) => {
          const labelId = tl.label?.id || tl.labelId || tl.id
          return labelId === labelFilter
        })
        if (!hasLabel) return false
      }

      // Quick filters
      if (quickFilter === 'my-tasks') {
        const currentUser = boardUsers.find(u => u.email === session?.user?.email)
        if (task.assigneeId !== currentUser?.id) return false
      }
      
      if (quickFilter === 'high-priority' && task.priority !== 'high') {
        return false
      }
      
      if (quickFilter === 'overdue') {
        if (!task.dueDate) return false
        const dueDate = new Date(task.dueDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (dueDate >= today) return false
      }

      return true
    })
  }

  function clearFilters() {
    setAssigneeFilter('')
    setPriorityFilter('')
    setLabelFilter('')
    setQuickFilter('')
  }

  async function deleteSubtask(subtaskId: string) {
    const res = await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' })
    if (res.ok) {
      setSubtasks(subtasks.filter(s => s.id !== subtaskId))
    }
  }

  async function uploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedTask || !e.target.files?.length) return

    const file = e.target.files[0]
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size is 50MB.')
      e.target.value = ''
      return
    }

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const newAttachment = await res.json()
        setAttachments([...attachments, newAttachment])
      } else {
        const error = await res.json()
        alert(error.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  async function deleteAttachment(attachmentId: string) {
    if (!confirm('Delete this attachment?')) return

    const res = await fetch(`/api/attachments/${attachmentId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      setAttachments(attachments.filter(a => a.id !== attachmentId))
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  async function saveColumns(cols?: Array<{ id: string; name: string }>) {
    if (!project) return
    try {
      const toSave = cols || columns
      console.log('Saving columns (toSave):', toSave)
      const payload = { columns: JSON.stringify(toSave) }
      console.log('Payload:', payload)

      // Optimistic update using the provided cols or current state
      mutate({ ...project, columns: JSON.stringify(toSave) }, false)

      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', res.status)

      if (res.ok) {
        setEditingColumns(false)
        setOriginalColumns(JSON.parse(JSON.stringify(toSave))) // Update original columns
        alert('Columns saved successfully!')
        // Revalidate in background
        mutate()
      } else {
        const errorText = await res.text()
        console.error('Failed to save columns. Status:', res.status, 'Error:', errorText)
        alert(`Failed to save columns (${res.status}). Check console for details.`)
        // Revert on error
        mutate()
      }
    } catch (err) {
      console.error('Failed to save columns', err)
      alert('Failed to save columns. Please try again.')
      // Revert on error
      mutate()
    }
  }

  function hasUnsavedChanges() {
    return JSON.stringify(columns) !== JSON.stringify(originalColumns)
  }

  function updateColumnName(index: number, newName: string) {
    const updated = [...columns]
    updated[index] = { ...updated[index], name: newName }
    setColumns(updated)
  }

  function deleteColumn(index: number): Array<{ id: string; name: string }> {
    const newCols = columns.filter((_, i) => i !== index)
    setColumns(newCols)
    return newCols
  }

  function addColumn(): Array<{ id: string; name: string }> | undefined {
    const trimmedName = newColumnName.trim()
    if (!trimmedName) return

    // Generate a unique ID to avoid duplicates
    const baseId = trimmedName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    let newId = baseId
    let counter = 1

    // Ensure unique ID
    while (columns.some(col => col.id === newId)) {
      newId = `${baseId}-${counter}`
      counter++
    }

    const newColumns = [...columns, { id: newId, name: trimmedName }]
    setColumns(newColumns)
    setNewColumnName('')

    // Show success feedback
    console.log(`Column "${trimmedName}" added successfully. Remember to save changes!`)
    return newColumns
  }

  async function changeAssignee(taskId: string, assigneeId: string | null) {
    if (!project) return
    
    // Optimistic update
    const optimisticProject = {
      ...project,
      tasks: project.tasks.map((t: any) =>
        t.id === taskId ? { ...t, assigneeId } : t
      ),
    }
    mutate(optimisticProject, false)
    
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, assigneeId } as any)
    }
    
    await fetch(`/api/tasks/${taskId}`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ assigneeId }) 
    })
    
    // Revalidate in background
    mutate()
  }

  async function inviteNewMember(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!newMemberEmail) return
    setInviting(true)
    try {
      // Create new user account with temporary password
      const tempPassword = Math.random().toString(36).slice(-8)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail, password: tempPassword, name: newMemberName })
      })
      if (res.ok) {
        // Refresh users list
        const uRes = await fetch('/api/users')
        const uJson = await uRes.json()
        setUsers(uJson)
        setBoardUsers(uJson)
        setNewMemberEmail('')
        setNewMemberName('')
        alert(`Member invited! Temporary password: ${tempPassword}\nPlease share this with ${newMemberEmail}`)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to invite member')
      }
    } catch (err) {
      console.error('Failed to invite member', err)
      alert('Failed to invite member')
    }
    setInviting(false)
  }

  async function removeMemberFromTask(taskId: string, userId: string) {
    if (!project) return
    const task = project.tasks.find((t: any) => t.id === taskId)
    if (!task) return
    const currentMembers = (task as any).members || []
    const nextIds = currentMembers.filter((m: any) => m.userId !== userId).map((m: any) => m.userId)
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: nextIds })
      })
      
      if (res.ok) {
        // Revalidate to get updated data
        mutate()
      }
    } catch (err) {
      console.error('Failed to remove member', err)
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>
  
  if (!session) {
    return (
      <>
        <Navbar />
        <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
          <h1>Project Details</h1>
          <p>Please sign in to view project details.</p>
          <button onClick={() => signIn()} style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Sign in</button>
        </main>
      </>
    )
  }
  
  if (!project) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
          <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>← Back to Projects</a>
          <p style={{ marginTop: 16 }}>Project not found</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="project-main" style={{ 
        padding: '16px 20px', 
        height: 'calc(100vh - 80px)', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        background: getBackgroundStyle(project.background || 'gradient-purple'),
        transition: 'background 0.3s ease'
      }}>
        <ProjectHeader
          project={project}
          onEditLabels={() => setShowLabelsModal(true)}
          onEditBackground={() => setShowBackgroundPicker(true)}
          onShowWorkflows={() => setShowWorkflows(true)}
          onShowManageTemplates={() => setShowManageTemplates(true)}
          onEditColumns={() => setEditingColumns(true)}
          currentView={currentView}
          onViewChange={setCurrentView}
          workflows={workflows}
        />

        {/* Filters Dropdown */}
        {showFilters && (
          <div style={{ 
            marginBottom: 16, 
            flexShrink: 0,
            background: 'var(--card-bg)',
            padding: 16,
            borderRadius: 12,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setQuickFilter(quickFilter === 'my-tasks' ? '' : 'my-tasks')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${quickFilter === 'my-tasks' ? 'var(--primary)' : 'var(--border)'}`,
                  background: quickFilter === 'my-tasks' ? 'var(--primary-light)' : 'var(--surface)',
                  color: quickFilter === 'my-tasks' ? 'var(--primary)' : 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                My Tasks
              </button>
              <button
                onClick={() => setQuickFilter(quickFilter === 'high-priority' ? '' : 'high-priority')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${quickFilter === 'high-priority' ? 'var(--primary)' : 'var(--border)'}`,
                  background: quickFilter === 'high-priority' ? 'var(--primary-light)' : 'var(--surface)',
                  color: quickFilter === 'high-priority' ? 'var(--primary)' : 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                ● High Priority
              </button>
              <button
                onClick={() => setQuickFilter(quickFilter === 'overdue' ? '' : 'overdue')}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${quickFilter === 'overdue' ? 'var(--primary)' : 'var(--border)'}`,
                  background: quickFilter === 'overdue' ? 'var(--primary-light)' : 'var(--surface)',
                  color: quickFilter === 'overdue' ? 'var(--primary)' : 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                ⏰ Overdue
              </button>
            </div>

            {/* Detailed Filters */}
            <div className="filters-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Assignee Filter */}
              <select
                value={assigneeFilter || ''}
                onChange={(e) => setAssigneeFilter(e.target.value || null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {boardUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter || ''}
                onChange={(e) => setPriorityFilter(e.target.value || null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <option value="">All Priorities</option>
                <option value="low">● Low Priority</option>
                <option value="medium">● Medium Priority</option>
                <option value="high">● High Priority</option>
              </select>

              {/* Label Filter */}
              <select
                value={labelFilter || ''}
                onChange={(e) => setLabelFilter(e.target.value || null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <option value="">All Labels</option>
                {(project.labels || []).map((label: any) => (
                  <option key={label.id} value={label.id}>{label.name}</option>
                ))}
              </select>

              {/* Clear Filters Button */}
              {(assigneeFilter || priorityFilter || labelFilter || quickFilter) && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2'
                    e.currentTarget.style.color = 'var(--danger)'
                    e.currentTarget.style.borderColor = '#fecaca'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar" style={{ 
          marginBottom: 16, 
          flexShrink: 0,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                paddingLeft: 40,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: showFilters ? 'var(--primary-light)' : 'var(--surface)',
              color: showFilters ? 'var(--primary)' : 'var(--text)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = showFilters ? 'var(--primary-light)' : 'var(--bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = showFilters ? 'var(--primary-light)' : 'var(--surface)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filters
            {(assigneeFilter || priorityFilter || labelFilter || quickFilter) && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>
                {[assigneeFilter, priorityFilter, labelFilter, quickFilter].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Advanced Filters Button */}
          {canUseAdvancedFilters ? (
            <button
              onClick={() => setShowAdvancedFilter(true)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.borderColor = 'var(--primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M7 12h10"></path>
                <path d="M11 18h2"></path>
              </svg>
              Advanced
            </button>
          ) : (
            <button
              disabled
              title="Available on Pro"
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'default',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: 0.9
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M7 12h10"></path>
                <path d="M11 18h2"></path>
              </svg>
              Advanced 🔒
            </button>
          )}
        </div>

        {/* Background Picker Modal */}
        {showBackgroundPicker && (
          <>
            <div 
              onClick={() => setShowBackgroundPicker(false)}
              style={{ 
                position: 'fixed', 
                inset: 0, 
                background: 'rgba(0,0,0,0.5)', 
                backdropFilter: 'blur(4px)',
                zIndex: 999,
                animation: 'fadeIn 0.2s ease'
              }} 
            />
            <div style={{
              position: 'fixed',
              top: 80,
              right: 20,
              background: 'var(--surface)',
              borderRadius: 12,
              padding: 20,
              boxShadow: 'var(--shadow-xl)',
              zIndex: 1000,
              width: 320,
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              animation: 'slideUp 0.3s ease'
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                Board Background
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { id: 'gradient-purple', name: 'Purple Dream', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                  { id: 'gradient-blue', name: 'Ocean Blue', bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
                  { id: 'gradient-sunset', name: 'Sunset', bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
                  { id: 'gradient-forest', name: 'Forest', bg: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
                  { id: 'gradient-rose', name: 'Rose', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
                  { id: 'gradient-night', name: 'Night Sky', bg: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },
                  { id: 'gradient-mint', name: 'Mint', bg: 'linear-gradient(135deg, #0ba360 0%, #2d8a7f 100%)' },
                  { id: 'gradient-coral', name: 'Coral', bg: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' },
                  { id: 'gradient-gold', name: 'Gold', bg: 'linear-gradient(135deg, #f5a623 0%, #f7b731 100%)' },
                  { id: 'gradient-lavender', name: 'Lavender', bg: 'linear-gradient(135deg, #b993f3 0%, #9b7ebd 100%)' },
                  { id: 'gradient-peach', name: 'Peach', bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
                  { id: 'solid-light', name: 'Light', bg: '#f8f9fa' },
                  { id: 'solid-white', name: 'White', bg: '#ffffff' },
                  { id: 'solid-cream', name: 'Cream', bg: '#fffef5' },
                  { id: 'solid-gray', name: 'Gray', bg: '#f3f4f6' },
                  { id: 'solid-dark', name: 'Dark', bg: '#1a1a1a' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={async () => {
                      try {
                        await fetch(`/api/projects/${id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ background: bg.id })
                        })
                        await mutate()
                        setShowBackgroundPicker(false)
                      } catch (err) {
                        console.error('Failed to update background:', err)
                      }
                    }}
                    style={{
                      border: project.background === bg.id ? '3px solid var(--primary)' : '2px solid var(--border)',
                      borderRadius: 8,
                      padding: 0,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      position: 'relative',
                      height: 80
                    }}
                  >
                    <div style={{ 
                      background: bg.bg, 
                      width: '100%', 
                      height: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 8
                    }}>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 600, 
                        color: ['solid-dark', 'gradient-night', 'gradient-forest'].includes(bg.id) ? 'white' : ['solid-light', 'solid-white', 'solid-cream', 'gradient-peach'].includes(bg.id) ? '#333' : 'white',
                        textShadow: ['solid-light', 'solid-white', 'solid-cream', 'gradient-peach'].includes(bg.id) ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                      }}>
                        {bg.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Labels Management Modal */}
        {showLabelsModal && (
          <>
            {/* Modal Backdrop */}
            <div 
              onClick={() => setShowLabelsModal(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'var(--modal-backdrop)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease'
              }}
            />
            
            {/* Modal Content */}
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--surface)',
              borderRadius: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              zIndex: 1001,
              width: '90%',
              maxWidth: 500,
              maxHeight: '80vh',
              overflow: 'auto',
              animation: 'slideUp 0.3s ease',
              border: '1px solid var(--border)'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '24px 24px 16px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                background: 'var(--surface)',
                borderRadius: '16px 16px 0 0',
                zIndex: 1
              }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                  Manage Labels
                </h2>
                <button
                  onClick={() => setShowLabelsModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: 4,
                    borderRadius: 6,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >×</button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: 24 }}>
                {/* Create New Label Form */}
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  if (!newLabelName.trim()) return
                  try {
                    const res = await fetch(`/api/projects/${id}/labels`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor })
                    })
                    if (res.ok) {
                      setNewLabelName('')
                      setNewLabelColor('#6b7280')
                      // Revalidate project data
                      mutate()
                    }
                  } catch (err) {
                    console.error('Failed to create label', err)
                  }
                }} style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 24,
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  border: '1px solid var(--border)'
                }}>
                  <input
                    type="text"
                    placeholder="New label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 14
                    }}
                  />
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    title="Color"
                    style={{
                      width: 50,
                      height: 42,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: 'var(--surface)'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Add Label
                  </button>
                </form>

                {/* Existing Labels */}
                <div>
                  <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Project Labels ({project.labels?.length || 0})
                  </h3>
                  
                  {project.labels && project.labels.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {project.labels.map((label: any) => {
                        // Calculate text color based on background brightness
                        const hex = label.color || '#6b7280'
                        const r = parseInt(hex.slice(1, 3), 16)
                        const g = parseInt(hex.slice(3, 5), 16)
                        const b = parseInt(hex.slice(5, 7), 16)
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000
                        const textColor = brightness > 155 ? '#111827' : '#ffffff'

                        return (
                          <div
                            key={label.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              background: 'var(--bg-secondary)',
                              borderRadius: 10,
                              border: '1px solid var(--border)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: label.color || '#6b7280',
                                border: '2px solid var(--border)',
                                flexShrink: 0
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'var(--text)',
                                marginBottom: 2
                              }}>
                                {label.name}
                              </div>
                              <div style={{
                                fontSize: 12,
                                color: 'var(--text-secondary)'
                              }}>
                                {label.color || '#6b7280'}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete label \"${label.name}\"?`)) return
                                try {
                                  const res = await fetch(`/api/labels/${label.id}`, { method: 'DELETE' })
                                  if (res.ok) {
                                    // Revalidate project data
                                    mutate()
                                  }
                                } catch (err) {
                                  console.error('Failed to delete label', err)
                                }
                              }}
                              style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2'
                                e.currentTarget.style.color = '#dc2626'
                                e.currentTarget.style.borderColor = '#fecaca'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                                e.currentTarget.style.color = 'var(--text-secondary)'
                                e.currentTarget.style.borderColor = 'var(--border)'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: 14
                    }}>
                      No labels yet. Create one above to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      {editingColumns && (
        <>
          {/* Modal Backdrop */}
          <div 
            onClick={() => setEditingColumns(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'var(--modal-backdrop)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease'
            }}
          />
          
          {/* Modal Content */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--surface)',
            borderRadius: 16,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 1001,
            width: '90%',
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
            animation: 'slideUp 0.3s ease',
            border: '1px solid var(--border)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: 'var(--surface)',
              borderRadius: '16px 16px 0 0',
              zIndex: 1
            }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                Manage Columns
                {hasUnsavedChanges() && (
                  <span style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    background: '#fbbf24',
                    color: '#92400e',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    Unsaved Changes
                  </span>
                )}
              </h2>
              <button
                onClick={() => {
                  if (hasUnsavedChanges()) {
                    if (confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
                      setEditingColumns(false)
                      // Reset columns to original state
                      setColumns(JSON.parse(JSON.stringify(originalColumns)))
                    }
                  } else {
                    setEditingColumns(false)
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 4,
                  lineHeight: 1,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                Customize your board columns. Drag to reorder, edit names, or add new columns.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {columns.map((col, index) => (
                  <div 
                    key={col.id} 
                    style={{ 
                      display: 'flex', 
                      gap: 8, 
                      alignItems: 'center',
                      background: 'var(--bg-secondary)',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 20,
                      color: 'var(--muted)',
                      cursor: 'grab',
                      fontSize: 18
                    }}>⋮⋮</div>
                    <input 
                      value={col.name} 
                      onChange={(e) => updateColumnName(index, e.target.value)}
                      style={{ 
                        flex: 1, 
                        padding: '10px 12px', 
                        borderRadius: 6, 
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        fontSize: 14,
                        transition: 'all 0.2s',
                        color: 'var(--text)'
                      }}
                    />
                    <button 
                      onClick={() => {
                        // delete locally but do not save automatically here
                        deleteColumn(index)
                      }}
                      style={{ 
                        padding: '8px 14px', 
                        background: 'var(--surface)',
                        color: 'var(--danger)',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fef2f2'
                        e.currentTarget.style.borderColor = '#ef4444'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface)'
                        e.currentTarget.style.borderColor = '#fecaca'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}

                {/* Add New Column */}
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  marginTop: 8,
                  padding: 12,
                  background: '#f0fdf4',
                  borderRadius: 8,
                  border: '1px dashed #86efac'
                }}>
                  <input 
                    placeholder="New column name" 
                    value={newColumnName} 
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addColumn()}
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
                  <button 
                    onClick={addColumn}
                    style={{ 
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
                    + Add
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              position: 'sticky',
              bottom: 0,
              background: 'var(--surface)',
              borderRadius: '0 0 16px 16px'
            }}>
              <button
                onClick={() => setEditingColumns(false)}
                style={{
                  padding: '10px 20px',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
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
              <button 
                onClick={() => saveColumns()}
                style={{ 
                  padding: '10px 24px', 
                  background: 'linear-gradient(to right, var(--gradient-start), var(--gradient-end))',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: '0 4px 6px rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(99, 102, 241, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(99, 102, 241, 0.3)'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* CSS Animations */}
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translate(-50%, -45%);
              }
              to { 
                opacity: 1;
                transform: translate(-50%, -50%);
              }
            }
          `}</style>
        </>
      )}

      <div style={{ position: 'relative', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Kanban View */}
        {currentView === 'kanban' && (
        <div className="kanban" style={{ gap: 16, height: '100%', display: 'flex', overflowX: 'auto', paddingBottom: 16 }}>
          {columns.map((col) => {
            const allColumnTasks = project?.tasks?.filter((t: Task) => t.status === col.id) || []
            const columnTasks = filterTasks(allColumnTasks)
            return (
              <section 
                key={col.id} 
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
                onDragEnter={() => setDragOverColumn(col.id)}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverColumn(null) }}
                style={{ 
                  flex: '0 0 280px',
                  minWidth: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  background: dragOverColumn === col.id 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  padding: 12,
                  borderRadius: 14,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: dragOverColumn === col.id ? '2px solid var(--primary)' : '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: dragOverColumn === col.id ? 'var(--shadow-xl)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
                  height: 'calc(100% - 40px)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
                  {editingColumnId === col.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                      <input
                        autoFocus
                        value={col.name}
                        onChange={(e) => updateColumnName(columns.findIndex(c => c.id === col.id), e.target.value)}
                        onBlur={async () => {
                          setEditingColumnId(null)
                          await saveColumns()
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingColumnId(null)
                            saveColumns()
                          }
                          if (e.key === 'Escape') {
                            setEditingColumnId(null)
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
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => setEditingColumnId(col.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: 6,
                            color: 'var(--text-secondary)',
                            fontSize: 16,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary-light)'
                            e.currentTarget.style.color = 'var(--primary)'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                          title="Edit column name"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete column "${col.name}"? Tasks in this column will not be deleted.`)) {
                              const newCols = deleteColumn(columns.findIndex(c => c.id === col.id))
                              await saveColumns(newCols)
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: 6,
                            color: 'var(--text-secondary)',
                            fontSize: 16,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2'
                            e.currentTarget.style.color = 'var(--danger)'
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                          title="Delete column"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
                {columnTasks.map((t: Task) => (
                  <React.Fragment key={t.id}>
                    {draggingTaskId && dragOverTaskId === t.id && (
                      <li key={`placeholder-${t.id}`} style={{ background: 'var(--card-bg)', padding: 12, marginBottom: 8, borderRadius: 4, minHeight: 48 }} />
                    )}

                    <li
                      data-task-id={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id, t.title)}
                      onDragEnd={() => clearDragState()}
                      onDragEnter={(e) => onDragEnterTask(e, t.id)}
                      onDragLeave={(e) => onDragLeaveTask(e, t.id)}
                      className="task-card"
                      style={{
                        background: 'var(--card-bg)',
                        padding: 12,
                        marginBottom: 10,
                        borderRadius: 10,
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'grab',
                        borderLeft: '3px solid var(--primary)',
                        opacity: draggingTaskId === t.id ? 0.6 : 1,
                        position: 'relative',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: '1px solid var(--border)',
                        borderLeftWidth: '3px',
                        borderLeftColor: 'var(--primary)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Cover color bar */}
                      {(t as any).coverColor && (
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
                            return colorMap[(t as any).coverColor] || 'transparent'
                          })(),
                          borderTopLeftRadius: 9,
                          borderTopRightRadius: 9
                        }} />
                      )}
                      <button className="card-edit-icon" onClick={(e) => { e.stopPropagation(); openTask(t) }} title="Edit task">
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
                          }} onClick={() => openTask(t)}>{t.title}</strong>
                        </div>
                        
                        {/* Member avatars */}
                        {(t as any).members && (t as any).members.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {(t as any).members?.slice(0, 3).map((m: any) => (
                              <div key={m.userId} style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, border: '2px solid var(--surface)', flexShrink: 0 }} title={m.user?.name || m.user?.email}>
                                {(m.user?.name || m.user?.email || '').split(' ').map((s: string) => s[0]).join('').slice(0,2).toUpperCase()}
                              </div>
                            ))}
                            {(t as any).members?.length > 3 && (
                              <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, border: '2px solid var(--surface)', flexShrink: 0 }}>+{(t as any).members.length - 3}</div>
                            )}
                          </div>
                        )}
                        
                        {/** labels and priority */}
                        {(t.labels && t.labels.length > 0) || (t as any).priority ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Priority indicator */}
                            {(t as any).priority && (
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 5,
                                background: (() => {
                                  const priority = (t as any).priority
                                  if (priority === 'high') return 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                                  if (priority === 'low') return 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                                  return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                })(),
                                color: (() => {
                                  const priority = (t as any).priority
                                  if (priority === 'high') return '#991b1b'
                                  if (priority === 'low') return '#065f46'
                                  return '#92400e'
                                })(),
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                display: 'inline-block',
                                boxShadow: (() => {
                                  const priority = (t as any).priority
                                  if (priority === 'high') return '0 1px 4px rgba(239, 68, 68, 0.15)'
                                  if (priority === 'low') return '0 1px 4px rgba(16, 185, 129, 0.15)'
                                  return '0 1px 4px rgba(245, 158, 11, 0.15)'
                                })(),
                                border: (() => {
                                  const priority = (t as any).priority
                                  if (priority === 'high') return '1px solid #fca5a5'
                                  if (priority === 'low') return '1px solid #6ee7b7'
                                  return '1px solid #fcd34d'
                                })(),
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.3px'
                              }}>
                                {(t as any).priority}
                              </span>
                            )}
                            
                            {/* Labels */}
                            {t.labels && t.labels.length > 0 && t.labels.map((tl: any) => {
                              const label = tl.label || tl
                              // Check if color is light or dark for text contrast
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
                        
                        {t.description && (
                          <div style={{ 
                            fontSize: 12, 
                            color: 'var(--text-secondary)', 
                            lineHeight: 1.5,
                            marginTop: 4,
                            wordBreak: 'break-word'
                          }}>{t.description}</div>
                        )}

                        {/* Subtasks progress */}
                        {(t as any).subtasks && (t as any).subtasks.length > 0 && (
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
                              {(t as any).subtasks.filter((s: any) => s.completed).length}/{(t as any).subtasks.length}
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
                                width: `${((t as any).subtasks.filter((s: any) => s.completed).length / (t as any).subtasks.length) * 100}%`,
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                          </div>
                        )}
                        
                        {/* Due Date */}
                        {(t as any).dueDate && (
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
                              const due = new Date((t as any).dueDate)
                              const today = new Date()
                              const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                              if (diffDays < 0) return '#fee2e2' // Overdue - red
                              if (diffDays <= 2) return '#fef3c7' // Due soon - yellow
                              return '#dbeafe' // Future - blue
                            })(),
                            color: (() => {
                              const due = new Date((t as any).dueDate)
                              const today = new Date()
                              const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                              if (diffDays < 0) return '#991b1b' // Overdue
                              if (diffDays <= 2) return '#92400e' // Due soon
                              return '#1e40af' // Future
                            })()
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            {new Date((t as any).dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {(() => {
                              const due = new Date((t as any).dueDate)
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
                  </React.Fragment>
                ))}

                {draggingTaskId && dragOverColumn === col.id && !dragOverTaskId && (
                  <li key={`placeholder-end-${col.id}`} style={{ background: '#fafafa', padding: 12, marginBottom: 8, borderRadius: 4, border: '2px dashed #ddd', minHeight: 48 }} />
                )}
              </ul>
              
              {/* Add Task Form at bottom of column */}
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
                    onChange={(e) => setColumnTaskInputs({ ...columnTaskInputs, [col.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (columnTaskInputs[col.id] || '').trim()) {
                        e.preventDefault()
                        createTask(e, col.id)
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
                    onClick={() => {
                      setShowTemplatesForColumn(col.id)
                      setShowTemplateSelector(true)
                    }}
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
            height: 'calc(100% - 40px)'
          }}
        >
          {addingColumn ? (
            <div style={{
              background: 'var(--column-bg)',
              padding: 16,
              borderRadius: 12,
              border: '2px solid var(--primary)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <input
                autoFocus
                placeholder="Column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onBlur={() => {
                  if (!newColumnName.trim()) {
                    setAddingColumn(false)
                    setNewColumnName('')
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newColumnName.trim()) {
                    const newCols = addColumn()
                    if (newCols) await saveColumns(newCols)
                    setAddingColumn(false)
                  }
                  if (e.key === 'Escape') {
                    setAddingColumn(false)
                    setNewColumnName('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 14,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  marginBottom: 8
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    if (newColumnName.trim()) {
                      const newCols = addColumn()
                      if (newCols) await saveColumns(newCols)
                      setAddingColumn(false)
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setAddingColumn(false)
                    setNewColumnName('')
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'var(--surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              style={{
                background: 'var(--column-bg)',
                border: '2px dashed var(--border)',
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: 100
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
        )}

        {/* Calendar View */}
        {currentView === 'calendar' && (
          <CalendarView 
            tasks={filterTasks(project?.tasks || [])}
            onTaskClick={openTask}
            users={boardUsers}
          />
        )}

        {/* Table View */}
        {currentView === 'table' && (
          <TableView 
            tasks={filterTasks(project?.tasks || [])}
            onTaskClick={openTask}
            users={boardUsers}
          />
        )}

        {/* Timeline View */}
        {currentView === 'timeline' && (
          <TimelineView 
            tasks={filterTasks(project?.tasks || [])}
            onTaskClick={openTask}
            users={boardUsers}
          />
        )}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease' }} onClick={() => setSelectedTask(null)}>
          <div style={{ width: '90%', maxWidth: 1200, background: 'var(--surface)', borderRadius: 20, padding: 32, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)', animation: 'slideUp 0.3s ease' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                <input
                  value={ (selectedTask as any).title }
                  onChange={(e) => setSelectedTask({ ...(selectedTask as any), title: e.target.value }) }
                  style={{ fontSize: 24, fontWeight: 800, border: 'none', outline: 'none', width: '100%', background: 'transparent', color: 'var(--text)', padding: 0 }}
                  placeholder="Task title"
                />
                {/* Color Picker Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.background = 'var(--hover-bg)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--surface)'
                    }}
                    title="Change card cover color"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r=".5"></circle>
                      <circle cx="17.5" cy="10.5" r=".5"></circle>
                      <circle cx="8.5" cy="7.5" r=".5"></circle>
                      <circle cx="6.5" cy="12.5" r=".5"></circle>
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
                    </svg>
                  </button>
                  
                  {/* Color Picker Dropdown */}
                  {showColorPicker && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 8,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 1000,
                      width: 200
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Card Cover
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {[
                          { name: 'None', color: null },
                          { name: 'Purple', color: '#9333ea' },
                          { name: 'Blue', color: '#2563eb' },
                          { name: 'Green', color: '#059669' },
                          { name: 'Yellow', color: '#ca8a04' },
                          { name: 'Orange', color: '#ea580c' },
                          { name: 'Red', color: '#dc2626' },
                          { name: 'Pink', color: '#db2777' },
                          { name: 'Gray', color: '#6b7280' }
                        ].map(({ name, color }) => (
                          <button
                            key={name}
                            onClick={() => {
                              setSelectedTask({ ...(selectedTask as any), coverColor: color })
                              setShowColorPicker(false)
                            }}
                            style={{
                              width: '100%',
                              aspectRatio: '1',
                              borderRadius: 8,
                              border: (selectedTask as any).coverColor === color ? '2px solid var(--primary)' : '1px solid var(--border)',
                              background: color || 'var(--bg-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                            title={name}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                          >
                            {!color && <span style={{ fontSize: 18 }}>✕</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={async () => {
                    if (!selectedTask) return
                    
                    try {
                      const res = await fetch(`/api/tasks/${selectedTask.id}/duplicate`, { 
                        method: 'POST'
                      })
                      
                      if (!res.ok) {
                        alert('Failed to duplicate task')
                        return
                      }
                      
                      const duplicatedTask = await res.json()
                      
                      // Revalidate and open the new task
                      await mutate()
                      
                      // Find and open the duplicated task
                      if (project) {
                        const newTask = project.tasks.find((t: Task) => t.id === duplicatedTask.id)
                        if (newTask) {
                          setSelectedTask(newTask)
                          // Fetch activities for the new task
                          const activitiesRes = await fetch(`/api/tasks/${newTask.id}/activities`)
                          if (activitiesRes.ok) {
                            const activitiesData = await activitiesRes.json()
                            setActivities(activitiesData)
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Failed to duplicate task', err)
                      alert('Failed to duplicate task')
                    }
                  }}
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                  title="Duplicate this card"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Duplicate
                </button>
                <button 
                  onClick={async () => {
                  // Save changes
                  if (!selectedTask) return
                  const payload: any = { 
                    title: selectedTask.title,
                    coverColor: (selectedTask as any).coverColor ?? null
                  }
                  // include description and status if present
                  if ((selectedTask as any).description !== undefined) payload.description = (selectedTask as any).description
                  if ((selectedTask as any).status) payload.status = (selectedTask as any).status
                  if ((selectedTask as any).priority !== undefined) payload.priority = (selectedTask as any).priority
                  if ((selectedTask as any).dueDate !== undefined) payload.dueDate = (selectedTask as any).dueDate
                  
                  console.log('Saving task:', selectedTask.id, payload)
                  
                  try {
                    // optimistic UI update already in state; send patch
                    const res = await fetch(`/api/tasks/${selectedTask.id}`, { 
                      method: 'PATCH', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify(payload) 
                    })
                    
                    console.log('Save response:', res.status)
                    
                    if (!res.ok) {
                      const errorText = await res.text()
                      console.error('Failed to save task. Status:', res.status, 'Error:', errorText)
                      alert('Failed to save task. Please try again.')
                      return
                    }
                  } catch (err) {
                    console.error('Failed to save task', err)
                    alert('Failed to save task. Please try again.')
                    return
                  }
                  
                  // Revalidate project and update selected task
                  await mutate()
                  if (project) {
                    const updated = project.tasks.find((x: Task) => x.id === selectedTask.id)
                    setSelectedTask(updated || null)
                  }
                  alert('Task saved successfully!')
                }}
                  style={{
                    background: 'linear-gradient(to right, var(--gradient-start), var(--gradient-end))',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  💾 Save
                </button>
                <button 
                  onClick={() => setSelectedTask(null)}
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Left column: Task details */}
              <div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                  <textarea
                    value={(selectedTask as any).description || ''}
                    onChange={(e) => setSelectedTask({ ...(selectedTask as any), description: e.target.value })}
                    placeholder="Add a detailed description..."
                    rows={4}
                    style={{ 
                      width: '100%', 
                      padding: '12px 14px', 
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      lineHeight: 1.6,
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-light)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                  <select 
                    value={(selectedTask as any).status || columns[0]?.id} 
                    onChange={(e) => setSelectedTask({ ...(selectedTask as any), status: e.target.value })} 
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</label>
                  <select 
                    value={(selectedTask as any).priority || 'medium'} 
                    onChange={(e) => setSelectedTask({ ...(selectedTask as any), priority: e.target.value })} 
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <option value="low">● Low Priority</option>
                    <option value="medium">● Medium Priority</option>
                    <option value="high">● High Priority</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due Date</label>
                  <input
                    type="date"
                    value={(selectedTask as any).dueDate ? new Date((selectedTask as any).dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedTask({ ...(selectedTask as any), dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cover Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: null, name: 'None', color: 'transparent', border: '2px dashed var(--border)' },
                      { id: 'red', name: 'Red', color: '#ef4444' },
                      { id: 'orange', name: 'Orange', color: '#f97316' },
                      { id: 'yellow', name: 'Yellow', color: '#eab308' },
                      { id: 'green', name: 'Green', color: '#22c55e' },
                      { id: 'blue', name: 'Blue', color: '#3b82f6' },
                      { id: 'purple', name: 'Purple', color: '#a855f7' },
                      { id: 'pink', name: 'Pink', color: '#ec4899' },
                      { id: 'gray', name: 'Gray', color: '#6b7280' }
                    ].map(colorOption => (
                      <button
                        key={colorOption.id || 'none'}
                        onClick={() => setSelectedTask({ ...(selectedTask as any), coverColor: colorOption.id })}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: colorOption.color,
                          border: (selectedTask as any).coverColor === colorOption.id ? '3px solid var(--primary)' : (colorOption.border || '1px solid var(--border)'),
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: (selectedTask as any).coverColor === colorOption.id ? '0 0 0 3px var(--primary-light)' : 'none'
                        }}
                        title={colorOption.name}
                        onMouseEnter={(e) => {
                          if ((selectedTask as any).coverColor !== colorOption.id) {
                            e.currentTarget.style.transform = 'scale(1.1)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 10, fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Members</label>
                  
                  {/* Current members with remove button */}
                  <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(selectedTask as any).members && (selectedTask as any).members.length > 0 ? (
                      (selectedTask as any).members.map((m: any) => (
                        <div key={m.userId} style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: 6, 
                          background: 'var(--primary)', 
                          color: '#fff', 
                          padding: '6px 10px', 
                          borderRadius: 6, 
                          fontSize: 13,
                          boxShadow: '0 1px 3px rgba(99, 102, 241, 0.3)'
                        }}>
                          <span>{m.user?.name || m.user?.email}</span>
                          <button
                            onClick={() => removeMemberFromTask((selectedTask as any).id, m.userId)}
                            style={{ 
                              background: 'rgba(255,255,255,0.2)', 
                              border: 'none', 
                              color: '#fff', 
                              cursor: 'pointer', 
                              padding: '2px 6px', 
                              fontSize: 16, 
                              fontWeight: 'bold',
                              borderRadius: 4,
                              lineHeight: 1,
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                            title="Remove member"
                          >×</button>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No members assigned</span>
                    )}
                  </div>

                  {/* Add member dropdown */}
                  {users.filter((u) => !(selectedTask as any).members?.some((m: any) => m.userId === u.id)).length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <select
                        value=""
                        onChange={async (e) => {
                          const userId = e.target.value
                          if (!userId) return
                          
                          const current = (selectedTask as any).members || []
                          const nextIds = [...current.map((m: any) => m.userId), userId]
                          
                          console.log('Adding member:', userId)
                          console.log('Current members:', current)
                          console.log('Next member IDs:', nextIds)
                          
                          try {
                            const res = await fetch(`/api/tasks/${(selectedTask as any).id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ memberIds: nextIds })
                            })
                            
                            console.log('Response status:', res.status)
                            
                            if (res.ok) {
                              const updatedTask = await res.json()
                              console.log('Updated task:', updatedTask)
                              
                              // Revalidate project and update selected task
                              await mutate()
                              if (project) {
                                const newSelectedTask = project.tasks.find((x: any) => x.id === (selectedTask as any).id)
                                setSelectedTask(newSelectedTask || null)
                                console.log('Task after refresh:', newSelectedTask)
                              }
                            } else {
                              const errorText = await res.text()
                              console.error('Failed to add member:', errorText)
                              alert('Failed to add member. Please try again.')
                            }
                          } catch (err) {
                            console.error('Failed to add member', err)
                            alert('Failed to add member. Please try again.')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'border-color 0.2s',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="">+ Add member...</option>
                        {users.filter((u) => !(selectedTask as any).members?.some((m: any) => m.userId === u.id)).map((u) => (
                          <option key={u.id} value={u.id}>{u.name || u.email}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Invite new member form */}
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ 
                      cursor: 'pointer', 
                      fontSize: 13, 
                      color: 'var(--primary)',
                      fontWeight: 500,
                      padding: '4px 0',
                      userSelect: 'none'
                    }}>+ Invite new member to organization</summary>
                    <form onSubmit={inviteNewMember} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="email"
                        placeholder="Email address"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: 13, 
                          borderRadius: 6, 
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Name (optional)"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: 13, 
                          borderRadius: 6, 
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)'
                        }}
                      />
                      <button 
                        type="submit" 
                        disabled={inviting || !newMemberEmail} 
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: 13,
                          background: (inviting || !newMemberEmail) ? 'var(--text-secondary)' : 'var(--primary)',
                          cursor: (inviting || !newMemberEmail) ? 'not-allowed' : 'pointer',
                          opacity: (inviting || !newMemberEmail) ? 0.6 : 1
                        }}
                      >
                        {inviting ? 'Inviting...' : 'Send Invite'}
                      </button>
                    </form>
                  </details>
                </div>

                {/* Subtasks / Checklist */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 12, fontWeight: 700, fontSize: 13, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Checklist {subtasks.length > 0 && (
                      <span style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)',
                        marginLeft: 10,
                        textTransform: 'none',
                        letterSpacing: 'normal'
                      }}>
                        {subtasks.filter(s => s.completed).length}/{subtasks.length} completed
                      </span>
                    )}
                  </label>

                  {/* Progress bar */}
                  {subtasks.length > 0 && (
                    <div style={{ 
                      height: 8, 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 6, 
                      overflow: 'hidden',
                      marginBottom: 16,
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ 
                        height: '100%', 
                        background: 'linear-gradient(to right, var(--gradient-start), var(--gradient-end))', 
                        width: `${(subtasks.filter(s => s.completed).length / subtasks.length) * 100}%`,
                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)'
                      }} />
                    </div>
                  )}

                  {/* Subtask list */}
                  <div style={{ marginBottom: 14 }}>
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10,
                        padding: '10px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 8,
                        marginBottom: 8,
                        transition: 'all 0.2s',
                        border: '1px solid var(--border)'
                      }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--hover-bg)'
                          e.currentTarget.style.borderColor = 'var(--border-hover)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-secondary)'
                          e.currentTarget.style.borderColor = 'var(--border)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={(e) => toggleSubtask(subtask.id, e.target.checked)}
                          style={{ 
                            width: 18, 
                            height: 18, 
                            cursor: 'pointer',
                            accentColor: 'var(--primary)'
                          }}
                        />
                        <span style={{ 
                          flex: 1, 
                          fontSize: 14,
                          color: subtask.completed ? 'var(--text-secondary)' : 'var(--text)',
                          textDecoration: subtask.completed ? 'line-through' : 'none',
                          transition: 'all 0.2s'
                        }}>
                          {subtask.title}
                        </span>
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          style={{ 
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontSize: 16,
                            lineHeight: 1,
                            opacity: 0.6,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                          title="Delete subtask"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add subtask form */}
                  <form onSubmit={addSubtask} style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="+ Add checklist item"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: 13,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskTitle.trim()}
                      style={{
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        background: newSubtaskTitle.trim() ? 'var(--primary)' : 'var(--text-secondary)',
                        color: 'white',
                        cursor: newSubtaskTitle.trim() ? 'pointer' : 'not-allowed',
                        opacity: newSubtaskTitle.trim() ? 1 : 0.6,
                        transition: 'all 0.2s'
                      }}
                    >
                      Add
                    </button>
                  </form>
                </div>

                {/* Attachments */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                    Attachments {attachments.length > 0 && (
                      <span style={{ 
                        fontSize: 12, 
                        fontWeight: 500, 
                        color: 'var(--text-secondary)',
                        marginLeft: 8
                      }}>
                        ({attachments.length})
                      </span>
                    )}
                  </label>

                  {/* Attachment list */}
                  {attachments.length > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {attachments.map((attachment) => (
                        <div key={attachment.id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 12,
                          padding: '10px 12px',
                          background: 'var(--bg-secondary)',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}>
                          {/* File icon */}
                          <div style={{ 
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            background: 'var(--primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                          </div>

                          {/* File info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <a
                              href={attachment.url}
                              download={attachment.originalName}
                              style={{
                                color: 'var(--text)',
                                textDecoration: 'none',
                                fontSize: 13,
                                fontWeight: 500,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text)'}
                            >
                              {attachment.originalName}
                            </a>
                            <div style={{ 
                              fontSize: 11, 
                              color: 'var(--text-secondary)',
                              marginTop: 2
                            }}>
                              {formatFileSize(attachment.size)} • {attachment.uploadedBy?.name || attachment.uploadedBy?.email}
                            </div>
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={() => deleteAttachment(attachment.id)}
                            style={{ 
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '6px',
                              fontSize: 16,
                              lineHeight: 1,
                              opacity: 0.6,
                              transition: 'all 0.2s',
                              borderRadius: 4
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1'
                              e.currentTarget.style.color = 'var(--danger)'
                              e.currentTarget.style.background = '#fee2e2'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.6'
                              e.currentTarget.style.color = 'var(--text-secondary)'
                              e.currentTarget.style.background = 'none'
                            }}
                            title="Delete attachment"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  <label style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px dashed var(--border)',
                    background: uploading ? 'var(--bg-secondary)' : 'var(--surface)',
                    color: uploading ? 'var(--text-secondary)' : 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: uploading ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.currentTarget.style.background = 'var(--primary-light)'
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.color = 'var(--primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading) {
                      e.currentTarget.style.background = 'var(--surface)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--text)'
                    }
                  }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input
                      type="file"
                      onChange={uploadAttachment}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                  
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Labels</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {(project.labels || []).map((l: any) => {
                        const selected = (selectedTask as any).labels?.some((tl: any) => (tl.label?.id || tl.labelId || tl.id) === l.id)
                        
                        // Calculate text color based on background brightness
                        const hex = l.color || '#6b7280'
                        const r = parseInt(hex.slice(1, 3), 16)
                        const g = parseInt(hex.slice(3, 5), 16)
                        const b = parseInt(hex.slice(5, 7), 16)
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000
                        const textColor = brightness > 155 ? '#111827' : '#ffffff'
                        
                        return (
                          <button
                            key={l.id}
                            onClick={async () => {
                              // toggle label
                              const cur = (selectedTask as any).labels || []
                              let nextIds: string[]
                              const currentLabelIds = cur.map((tl: any) => tl.label?.id || tl.labelId || tl.id)
                              if (selected) nextIds = currentLabelIds.filter((lid: string) => lid !== l.id)
                              else nextIds = [...currentLabelIds, l.id]
                              // send PATCH to update labels
                              try {
                                const res = await fetch(`/api/tasks/${(selectedTask as any).id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ labelIds: nextIds }) })
                                if (res.ok) {
                                  const updated = await res.json()
                                  // Revalidate project and update selected task
                                  await mutate()
                                  if (project) {
                                    setSelectedTask(project.tasks.find((x: any) => x.id === (selectedTask as any).id) || null)
                                  }
                                }
                              } catch (err) {
                                console.error('Failed to toggle label', err)
                              }
                            }}
                            style={{
                              border: selected ? '2px solid #111827' : '1px solid #d1d5db',
                              background: l.color || '#6b7280',
                              color: '#fff',
                              padding: '4px 12px',
                              borderRadius: 999,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: selected ? 600 : 400,
                              opacity: selected ? 1 : 0.8
                            }}
                          >
                            {selected ? '✓ ' : ''}{l.name}
                          </button>
                        )
                      })}
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      if (!newLabelName) return
                      try {
                        const res = await fetch(`/api/projects/${id}/labels`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newLabelName, color: newLabelColor }) })
                        if (res.ok) {
                          setNewLabelName('')
                          setNewLabelColor('#6366f1')
                          // Revalidate project and update selected task
                          await mutate()
                          if (project && selectedTask) {
                            setSelectedTask(project.tasks.find((x: any) => x.id === (selectedTask as any).id) || null)
                          }
                        }
                      } catch (err) {
                        console.error('Failed to create label', err)
                      }
                    }} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      <input 
                        placeholder="New label name" 
                        value={newLabelName} 
                        onChange={(e) => setNewLabelName(e.target.value)} 
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} 
                      />
                      <input 
                        type="color" 
                        value={newLabelColor} 
                        onChange={(e) => setNewLabelColor(e.target.value)} 
                        title="Color" 
                        style={{ width: 44, height: 36, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer' }} 
                      />
                      <button 
                        type="submit" 
                        style={{ 
                          padding: '8px 16px', 
                          background: '#10b981', 
                          color: 'white', 
                          borderRadius: 6, 
                          fontSize: 13, 
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                      >
                        + Add
                      </button>
                    </form>
                  </div>
              </div>

              {/* Right column: Activity & Comments */}
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
                {/* Activity Log */}
                <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Activity
                </h4>
                
                {activities.length === 0 ? (
                  <div style={{ 
                    padding: 16, 
                    color: 'var(--text-secondary)', 
                    fontSize: 13,
                    background: 'var(--bg-secondary)',
                    borderRadius: 8,
                    marginBottom: 24
                  }}>
                    No activity yet
                  </div>
                ) : (
                  <div style={{ marginBottom: 24, maxHeight: 300, overflowY: 'auto' }}>
                    {activities.slice(0, 10).map((activity) => (
                      <div key={activity.id} style={{ 
                        padding: 12, 
                        marginBottom: 8,
                        background: 'var(--bg-secondary)',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'var(--text)',
                        borderLeft: '3px solid var(--primary)',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ marginBottom: 4 }}>
                          {formatActivityMessage(activity)}
                        </div>
                        <div style={{ 
                          fontSize: 11, 
                          color: 'var(--text-secondary)',
                          fontWeight: 400
                        }}>
                          {new Date(activity.createdAt).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Comments */}
                <h4 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Comments</h4>
              
              {comments.length === 0 ? (
                <div style={{ 
                  padding: 24, 
                  textAlign: 'center', 
                  color: 'var(--text-secondary)', 
                  fontSize: 14,
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  marginBottom: 16
                }}>
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 16, maxHeight: 400, overflowY: 'auto' }}>
                  {comments.map((c) => (
                    <li key={c.id} style={{ 
                      padding: 12, 
                      borderBottom: '1px solid var(--border)', 
                      marginBottom: 12,
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                      transition: 'background 0.2s'
                    }}>
                      <div style={{ 
                        fontSize: 12, 
                        color: 'var(--text-secondary)', 
                        marginBottom: 6,
                        fontWeight: 600
                      }}>
                        {c.author?.name || c.author?.email} 
                        <span style={{ fontWeight: 400, marginLeft: 6 }}>
                          · {new Date(c.createdAt).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                        {renderCommentBody(c.body)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={postComment} style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    placeholder="Write a comment (type @ to mention)" 
                    value={commentBody} 
                    onChange={handleCommentInput}
                    style={{ 
                      width: '100%', 
                      padding: '10px 80px 10px 12px', 
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }} 
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button 
                    type="submit" 
                    disabled={!commentBody.trim()}
                    style={{ 
                      position: 'absolute', 
                      right: 8, 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      padding: '6px 14px',
                      background: commentBody.trim() ? 'var(--primary)' : 'var(--text-secondary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: commentBody.trim() ? 'pointer' : 'not-allowed',
                      opacity: commentBody.trim() ? 1 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    Post
                  </button>
                  {showMentions && users.length > 0 && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '100%', 
                      left: 0, 
                      right: 0, 
                      background: 'var(--surface)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 6, 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                      maxHeight: 200, 
                      overflowY: 'auto', 
                      marginBottom: 4, 
                      zIndex: 10 
                    }}>
                      {users
                        .filter((u) => (u.name || u.email).toLowerCase().includes(mentionSearch))
                        .slice(0, 5)
                        .map((u) => (
                          <div
                            key={u.id}
                            onClick={() => insertMention(u)}
                            style={{ 
                              padding: '10px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid var(--border)', 
                              fontSize: 14,
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name || u.email}</div>
                            {u.name && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</div>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filter Modal */}
      <AdvancedFilterUI
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        users={boardUsers}
        labels={project?.labels || []}
        statuses={columns.map(c => c.id)}
        presets={presets}
        onSavePreset={(name) => savePreset(name, advancedFilters)}
        onLoadPreset={(preset) => {
          const filters = {
            assignee: preset.filters.assignee ?? null,
            priority: preset.filters.priority ?? null,
            label: preset.filters.label ?? null,
            status: preset.filters.status ?? null,
            search: preset.filters.search ?? null,
            dueDate: preset.filters.dueDate ?? null
          }
          setAdvancedFilters(filters)
        }}
        onDeletePreset={deletePreset}
      />

      {/* Workflows Modal */}
      <WorkflowUI
        isOpen={showWorkflows}
        onClose={() => setShowWorkflows(false)}
        workflows={workflows}
        users={boardUsers}
        labels={project?.labels || []}
        statuses={columns.map(c => c.id)}
        onSaveWorkflow={saveWorkflow}
        onUpdateWorkflow={updateWorkflow}
        onDeleteWorkflow={deleteWorkflow}
      />

      {/* Manage Templates Modal */}
      <ManageTemplates
        projectId={String(id)}
        isOpen={showManageTemplates}
        onClose={() => setShowManageTemplates(false)}
      />

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TaskTemplateSelector
          projectId={String(id)}
          onSelectTemplate={(template) => {
            if (template) {
              createTaskFromTemplate(template, showTemplatesForColumn || undefined)
            } else {
              setShowTemplateSelector(false)
            }
          }}
          onClose={() => {
            setShowTemplateSelector(false)
            setShowTemplatesForColumn(null)
          }}
        />
      )}
    </main>
    </>
  )
}
