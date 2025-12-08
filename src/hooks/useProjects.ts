import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useProjects(showArchived = false, shouldFetch = true) {
  const { data, error, mutate } = useSWR(
    shouldFetch ? `/api/projects?showArchived=${showArchived}` : null,
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

export function useOrganizations(shouldFetch = true) {
  const { data, error, mutate } = useSWR(
    shouldFetch ? '/api/organizations' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  )

  return {
    organizations: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
