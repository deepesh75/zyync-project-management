import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) return null
  return r.json()
})

export function useProject(projectId: string | undefined) {
  const { data, error, mutate } = useSWR(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch on window focus (too aggressive)
      revalidateOnReconnect: true, // Refetch when connection restored
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
    }
  )

  return {
    project: data,
    isLoading: !error && !data,
    isError: error,
    mutate, // For manual cache updates
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
