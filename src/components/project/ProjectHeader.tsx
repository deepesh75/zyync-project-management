import React, { useState } from 'react'
import { FeatureGate } from '../FeatureGate'
import type { Feature } from '../../lib/permissions'

interface ProjectHeaderProps {
  project: any
  onEditLabels: () => void
  onEditBackground: () => void
  onShowWorkflows: () => void
  onShowManageTemplates: () => void
  onEditColumns: () => void
  currentView: 'kanban' | 'calendar' | 'table' | 'timeline'
  onViewChange: (view: 'kanban' | 'calendar' | 'table' | 'timeline') => void
  workflows: any[]
}

export default function ProjectHeader({
  project,
  onEditLabels,
  onEditBackground,
  onShowWorkflows,
  onShowManageTemplates,
  onEditColumns,
  currentView,
  onViewChange,
  workflows
}: ProjectHeaderProps) {
  const [showToolsMenu, setShowToolsMenu] = useState(false)

  return (
    <header style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >← Back</a>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
          {project.name}
          {project.archived && (
            <span style={{ 
              marginLeft: 12, 
              padding: '4px 12px', 
              background: '#f3f4f6', 
              color: '#6b7280', 
              borderRadius: 6, 
              fontSize: 13, 
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>Archived</span>
          )}
        </h1>
      </div>
      
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Tools Dropdown Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-secondary)'
              e.currentTarget.style.borderColor = 'var(--primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
            Tools
          </button>
          
          {showToolsMenu && (
            <>
              <div 
                onClick={() => setShowToolsMenu(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999
                }}
              />
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: 200,
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => {
                    onEditLabels()
                    setShowToolsMenu(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderBottom: '1px solid var(--border)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                  <span style={{ flex: 1 }}>Labels</span>
                  {project.labels && project.labels.length > 0 && (
                    <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>
                      {project.labels.length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    onEditBackground()
                    setShowToolsMenu(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderBottom: '1px solid var(--border)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                  </svg>
                  Background
                </button>
                
                <button
                  onClick={() => {
                    onShowManageTemplates()
                    setShowToolsMenu(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <FeatureGate feature="templates">
                    <span>Templates</span>
                  </FeatureGate>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Workflows Button */}
        <FeatureGate feature="workflows">
          <button
            onClick={onShowWorkflows}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: workflows.length > 0 ? 'var(--primary-light)' : 'var(--surface)',
              color: workflows.length > 0 ? 'var(--primary)' : 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Workflows
            {workflows.length > 0 && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>
                {workflows.length}
              </span>
            )}
          </button>
        </FeatureGate>

        {/* View Switcher */}
        <div style={{ 
          display: 'flex', 
          gap: 4, 
          padding: '4px 8px',
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          marginLeft: 'auto'
        }}>
          {[
            { id: 'kanban', label: 'Kanban', icon: '▦' },
            { id: 'calendar', label: 'Calendar', icon: '📅', feature: 'calendar_view' as Feature },
            { id: 'table', label: 'Table', icon: '▥', feature: 'table_view' as Feature },
            { id: 'timeline', label: 'Timeline', icon: '▬', feature: 'timeline_view' as Feature }
          ].map(view => {
            const button = (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id as any)}
                title={view.label}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: currentView === view.id ? 'var(--primary)' : 'transparent',
                  color: currentView === view.id ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  minWidth: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (currentView !== view.id) {
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== view.id) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {view.icon}
              </button>
            )

            // Wrap premium views with FeatureGate
            if (view.feature) {
              return (
                <FeatureGate key={view.id} feature={view.feature}>
                  {button}
                </FeatureGate>
              )
            }

            return button
          })}
        </div>

        {/* Columns Management Button */}
        <button
          onClick={onEditColumns}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)'
            e.currentTarget.style.borderColor = 'var(--primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Columns
        </button>
      </div>
    </header>
  )
}
