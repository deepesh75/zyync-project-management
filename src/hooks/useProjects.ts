import { useEffect, useState, useRef } from 'react'

const fetcher = async (url: string) => {
  const r = await fetch(url)
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${r.status}`)
  }
  return r.json()
}

export function useProjects(showArchived = false, shouldFetch = true) {
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<any>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!shouldFetch) return
    let cancelled = false
    setIsLoading(true)
    fetcher(`/api/projects?showArchived=${showArchived}`)
      .then(data => {
        if (cancelled) return
        setProjects(Array.isArray(data) ? data : [])
        setIsError(null)
      })
      .catch(err => {
        if (cancelled) return
        setIsError(err)
        setProjects([])
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [showArchived, shouldFetch])

  async function mutate(updated?: any, revalidate = true) {
    if (updated !== undefined) {
      setProjects(updated)
      if (!revalidate) return Promise.resolve(updated)
    }
    if (!shouldFetch) return Promise.resolve(projects)
    try {
      const data = await fetcher(`/api/projects?showArchived=${showArchived}`)
      if (mounted.current) setProjects(Array.isArray(data) ? data : [])
      return data
    } catch (err) {
      setIsError(err)
      setProjects([])
      throw err
    }
  }

  return { projects, isLoading, isError, mutate }
}

export function useOrganizations(shouldFetch = true) {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<any>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    if (!shouldFetch) return
    let cancelled = false
    setIsLoading(true)
    fetcher('/api/organizations')
      .then(data => {
        if (cancelled) return
        setOrganizations(data || [])
        setIsError(null)
      })
      .catch(err => {
        if (cancelled) return
        setIsError(err)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [shouldFetch])

  async function mutate(updated?: any, revalidate = true) {
    if (updated !== undefined) {
      setOrganizations(updated)
      if (!revalidate) return Promise.resolve(updated)
    }
    if (!shouldFetch) return Promise.resolve(organizations)
    try {
      const data = await fetcher('/api/organizations')
      if (mounted.current) setOrganizations(data || [])
      return data
    } catch (err) {
      setIsError(err)
      throw err
    }
  }

  return { organizations, isLoading, isError, mutate }
}
