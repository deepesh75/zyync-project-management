import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useNotifications(shouldFetch = true) {
  const { data, error, mutate } = useSWR(
    shouldFetch ? '/api/notifications' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: shouldFetch ? 30000 : 0, // Poll every 30 seconds only if authenticated
      dedupingInterval: 2000,
    }
  )

  const notifications = data || []
  const unreadCount = notifications.filter((n: any) => !n.read).length

  return {
    notifications,
    unreadCount,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
