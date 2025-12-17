import { useEffect, useState, useRef } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useOrganization(id: string | undefined) {
  const [organization, setOrganization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<any>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    fetcher(`/api/organizations/${id}`)
      .then(data => {
        if (cancelled) return
        setOrganization(data)
        setIsError(null)
      })
      .catch(err => {
        if (cancelled) return
        setIsError(err)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    return () => { cancelled = true }
  }, [id])

  async function mutate(updated?: any, revalidate = true) {
    if (updated !== undefined) {
      setOrganization(updated)
      if (!revalidate) return Promise.resolve(updated)
    }
    if (!id) return Promise.resolve(null)
    try {
      const data = await fetcher(`/api/organizations/${id}`)
      if (mounted.current) setOrganization(data)
      return data
    } catch (err) {
      setIsError(err)
      throw err
    }
  }

  return { organization, isLoading, isError, mutate }
}
