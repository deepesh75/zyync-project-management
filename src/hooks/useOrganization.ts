import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) return null
  return r.json()
})

export function useOrganization(id: string | undefined) {
  const { data, error, mutate } = useSWR(
    id ? `/api/organizations/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  )

  return {
    organization: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
