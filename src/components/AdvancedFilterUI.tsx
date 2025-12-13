import React from 'react'
import { FilterPreset } from '../hooks/useFilterPresets'

interface AdvancedFilterUIProps {
  isOpen: boolean
  onClose: () => void
  filters: {
    assignee?: string | null
    priority?: string | null
    label?: string | null
    status?: string | null
    search?: string | null
  }
  onFiltersChange: (filters: any) => void
  users: Array<any>
  labels: Array<any>
  statuses: Array<string>
  presets: FilterPreset[]
  onSavePreset: (name: string, filters: any) => void
  onLoadPreset: (preset: FilterPreset) => void
  onDeletePreset: (id: string) => void
}

export default function AdvancedFilterUI({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  users,
  labels,
  statuses,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset
}: AdvancedFilterUIProps) {
  const [presetName, setPresetName] = React.useState('')
  const [showSavePreset, setShowSavePreset] = React.useState(false)

  if (!isOpen) return null

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || null
    })
  }

  const handleSavePreset = () => {
    if (!presetName.trim()) return
    onSavePreset(presetName, filters)
    setPresetName('')
    setShowSavePreset(false)
  }

  const hasActiveFilters = Object.values(filters).some(f => f)

  return (
    <>
      {/* Modal Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          width: '90%',
          maxWidth: 600,
          maxHeight: '85vh',
          overflow: 'auto',
          border: '1px solid var(--border)',
          animation: 'slideUp 0.3s ease'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: 'var(--surface)',
            zIndex: 1
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            Advanced Filters
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 4,
              borderRadius: 6,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-secondary)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Search Filter */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search tasks by title or description..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Assignee Filter */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Assignee
            </label>
            <select
              value={filters.assignee || ''}
              onChange={(e) => handleFilterChange('assignee', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: 14,
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Priority
            </label>
            <select
              value={filters.priority || ''}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: 14,
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Priorities</option>
              <option value="high">● High</option>
              <option value="medium">● Medium</option>
              <option value="low">● Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: 14,
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Statuses</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Label Filter */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Label
            </label>
            <select
              value={filters.label || ''}
              onChange={(e) => handleFilterChange('label', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: 14,
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Labels</option>
              {labels.map(label => (
                <option key={label.id} value={label.id}>{label.name}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={() => onFiltersChange({})}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 24,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fecaca'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fee2e2'
              }}
            >
              Clear All Filters
            </button>
          )}

          {/* Presets Section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Filter Presets
            </h3>

            {/* Save Preset Section */}
            {!showSavePreset ? (
              <button
                onClick={() => setShowSavePreset(true)}
                disabled={!hasActiveFilters}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: hasActiveFilters ? 'var(--primary)' : 'var(--bg-secondary)',
                  color: hasActiveFilters ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 16,
                  transition: 'all 0.2s'
                }}
              >
                + Save Current Filters
              </button>
            ) : (
              <div style={{
                display: 'flex',
                gap: 8,
                marginBottom: 16
              }}>
                <input
                  type="text"
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--primary)',
                    borderRadius: 8,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                    fontSize: 13
                  }}
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  style={{
                    padding: '10px 16px',
                    background: presetName.trim() ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: presetName.trim() ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 8,
                    cursor: presetName.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSavePreset(false)}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Presets List */}
            {presets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    style={{
                      padding: 12,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <button
                        onClick={() => onLoadPreset(preset)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 13,
                          textAlign: 'left'
                        }}
                      >
                        {preset.name}
                      </button>
                    </div>
                    <button
                      onClick={() => onDeletePreset(preset.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: '4px 8px',
                        borderRadius: 4,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee2e2'
                        e.currentTarget.style.color = '#dc2626'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                      title="Delete preset"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: 16,
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: 13
              }}>
                No saved presets yet
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
