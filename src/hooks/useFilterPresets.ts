import React from 'react'

export interface FilterPreset {
  id: string
  name: string
  filters: {
    assignee?: string | null
    priority?: string | null
    label?: string | null
    status?: string | null
    dueDate?: {
      from?: string
      to?: string
      isOverdue?: boolean
    } | null
    search?: string | null
  }
  createdAt: number
}

const STORAGE_KEY = 'zyync_filter_presets'

export function useFilterPresets() {
  const [presets, setPresets] = React.useState<FilterPreset[]>([])
  const [loaded, setLoaded] = React.useState(false)

  // Load presets from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setPresets(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error)
    }
    setLoaded(true)
  }, [])

  const savePreset = (name: string, filters: FilterPreset['filters']) => {
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name,
      filters,
      createdAt: Date.now()
    }
    const updated = [...presets, newPreset]
    setPresets(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save filter preset:', error)
    }
    return newPreset
  }

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to delete filter preset:', error)
    }
  }

  const updatePreset = (id: string, name: string, filters: FilterPreset['filters']) => {
    const updated = presets.map(p =>
      p.id === id ? { ...p, name, filters } : p
    )
    setPresets(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update filter preset:', error)
    }
  }

  return {
    presets,
    loaded,
    savePreset,
    deletePreset,
    updatePreset
  }
}
