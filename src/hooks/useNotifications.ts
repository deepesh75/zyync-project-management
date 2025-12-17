import { useEffect, useState, useRef } from 'react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useNotifications(shouldFetch = true) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isError, setIsError] = useState<any>(null)
  const mounted = useRef(true)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    if (!shouldFetch) return
    let cancelled = false
    setIsLoading(true)
    fetcher('/api/notifications')
      .then(data => {
        if (cancelled) return
        setNotifications(data || [])
        setIsError(null)
      })
      .catch(err => {
        if (cancelled) return
        setIsError(err)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    let interval: any = null
    if (shouldFetch) {
      interval = setInterval(() => {
        fetcher('/api/notifications')
          .then(data => { if (mounted.current) setNotifications(data || []) })
          .catch(() => {})
      }, 30000)
    }

    return () => { cancelled = true; if (interval) clearInterval(interval) }
  }, [shouldFetch])

  const unreadCount = notifications.filter((n: any) => !n.read).length

  async function mutate(updated?: any, revalidate = true) {
    if (updated !== undefined) {
      setNotifications(updated)
      if (!revalidate) return Promise.resolve(updated)
    }
    if (!shouldFetch) return Promise.resolve(notifications)
    try {
      const data = await fetcher('/api/notifications')
      if (mounted.current) setNotifications(data || [])
      return data
    } catch (err) {
      setIsError(err)
      throw err
    }
  }

  return { notifications, unreadCount, isLoading, isError, mutate }
}
