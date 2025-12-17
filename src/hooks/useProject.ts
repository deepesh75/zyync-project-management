import { useEffect, useState, useRef } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<any>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setIsLoading(true)
    fetcher(`/api/projects/${projectId}`)
      .then((data) => {
        if (cancelled) return
        setProject(data)
        setIsError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setIsError(err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  async function mutate(updated?: any, revalidate = true) {
    if (updated !== undefined) {
      setProject(updated)
      if (!revalidate) return Promise.resolve(updated)
    }

    if (!projectId) return Promise.resolve(null)
    try {
      const data = await fetcher(`/api/projects/${projectId}`)
      if (mounted.current) setProject(data)
      return data
    } catch (err) {
      setIsError(err)
      throw err
    }
  }

  return {
    project,
    isLoading,
    isError,
    mutate,
  }
}

// Helper to update task in cache without refetching
export function updateTaskInCache(
  mutate: any,
  project: any,
  taskId: string,
  updates: any
) {
  const updatedProject = {
    ...project,
    tasks: project.tasks.map((t: any) =>
      t.id === taskId ? { ...t, ...updates } : t
    ),
  }

  // Update cache immediately (optimistic)
  mutate(updatedProject, false)

  return updatedProject
}
