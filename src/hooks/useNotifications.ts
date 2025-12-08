import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useNotifications() {
  const { data, error, mutate } = useSWR('/api/notifications', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000, // Poll every 30 seconds
    dedupingInterval: 2000,
  })

  const unreadCount = data ? data.filter((n: any) => !n.read).length : 0

  return {
    notifications: data || [],
    unreadCount,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
