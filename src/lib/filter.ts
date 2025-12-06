type TaskLike = { title?: string; description?: string; assigneeId?: string | null; labels?: Array<any> }
type UserLike = { id: string; name?: string | null; email?: string }

export function matchesFilter(task: TaskLike, searchTerm: string, boardUsers: UserLike[]) {
  if (!searchTerm) return true
  const q = searchTerm.toLowerCase()
  if (task.title && task.title.toLowerCase().includes(q)) return true
  if (task.description && task.description.toLowerCase().includes(q)) return true
  const assignee = boardUsers.find((u) => u.id === task.assigneeId)
  if (assignee && ((assignee.name || assignee.email) || '').toLowerCase().includes(q)) return true
  const labels = task.labels || []
  if (labels.some((l: any) => (l.name || '').toLowerCase().includes(q))) return true
  return false
}

export default matchesFilter
