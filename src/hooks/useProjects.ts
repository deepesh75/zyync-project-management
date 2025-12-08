import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useProjects(showArchived = false) {
  const { data, error, mutate } = useSWR(
    `/api/projects?showArchived=${showArchived}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  )

  return {
    projects: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

export function useOrganizations() {
  const { data, error, mutate } = useSWR('/api/organizations', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  })

  return {
    organizations: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
