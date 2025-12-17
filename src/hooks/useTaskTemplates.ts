import { useEffect, useState, useRef } from 'react'

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
  const [templates, setTemplates] = useState<ParsedTaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<any>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setIsLoading(true)
    fetcher(`/api/projects/${projectId}/templates`)
      .then(data => {
        if (cancelled) return
        setTemplates(data || [])
        setIsError(null)
      })
      .catch(err => {
        if (cancelled) return
        setIsError(err)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [projectId])

  async function mutate(updated?: any, revalidate = true) {
    if (updated !== undefined) {
      setTemplates(updated)
      if (!revalidate) return Promise.resolve(updated)
    }
    if (!projectId) return Promise.resolve(templates)
    try {
      const data = await fetcher(`/api/projects/${projectId}/templates`)
      if (mounted.current) setTemplates(data || [])
      return data
    } catch (err) {
      setIsError(err)
      throw err
    }
  }

  const createTemplate = async (templateData: Partial<ParsedTaskTemplate>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      if (!response.ok) throw new Error('Failed to create template')
      const created = await response.json()
      await mutate()
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
      await mutate()
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
      await mutate()
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  }

  return {
    templates,
    isLoading,
    isError,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    mutate
  }
}
