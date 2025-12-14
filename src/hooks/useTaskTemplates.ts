import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ParsedTaskTemplate {
  id: string
  projectId: string
  name: string
  description: string | null
  priority: string | null
  coverColor: string | null
  labelIds: string[]
  defaultAssigneeId: string | null
  defaultMembers: string[]
  dueOffsetDays: number | null
  customFields: Record<string, any>
  createdAt: string
  updatedAt: string
}

export function useTaskTemplates(projectId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ParsedTaskTemplate[]>(
    projectId ? `/api/projects/${projectId}/templates` : null,
    fetcher
  )

  const createTemplate = async (templateData: Partial<ParsedTaskTemplate>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      if (!response.ok) throw new Error('Failed to create template')
      const created = await response.json()
      mutate()
      return created
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  const updateTemplate = async (templateId: string, templateData: Partial<ParsedTaskTemplate>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      if (!response.ok) throw new Error('Failed to update template')
      const updated = await response.json()
      mutate()
      return updated
    } catch (error) {
      console.error('Error updating template:', error)
      throw error
    }
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/templates/${templateId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete template')
      mutate()
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  }

  return {
    templates: data || [],
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    mutate
  }
}
