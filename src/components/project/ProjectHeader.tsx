import React, { useState } from 'react'
import { FeatureGate } from '../FeatureGate'
import type { Feature } from '../../lib/permissions'
import { useFeatureAccess } from '../../lib/permissions'

function getHeaderColorForBackground(bg: string): { text: string; background: string } {
  const darkBackgrounds = ['solid-dark', 'gradient-night', 'gradient-forest', 'gradient-terminal', 'gradient-steel', 'gradient-twilight', 'gradient-royal', 'gradient-velvet', 'gradient-ice']
  const lightBackgrounds = ['solid-light', 'solid-white', 'solid-cream', 'gradient-peach', 'gradient-aurora', 'gradient-mystic', 'gradient-crystal']
  
  if (darkBackgrounds.includes(bg)) {
    return { text: '#ffffff', background: 'rgba(0, 0, 0, 0.3)' }
  }
  if (lightBackgrounds.includes(bg)) {
    return { text: '#1a1a1a', background: 'rgba(255, 255, 255, 0.7)' }
  }
  // For colorful gradients, use white text with semi-transparent dark background
  return { text: '#ffffff', background: 'rgba(0, 0, 0, 0.2)' }
}

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
  const headerColors = getHeaderColorForBackground(project.background || 'gradient-purple')
  const canUseTemplates = useFeatureAccess('templates')
  const canUseWorkflows = useFeatureAccess('workflows')
  const canUseCalendar = useFeatureAccess('calendar_view')
  const canUseTable = useFeatureAccess('table_view')
  const canUseTimeline = useFeatureAccess('timeline_view')

  return (
    <>
      <style jsx>{`
        @media (max-width: 768px) {
          .project-header {
            padding: 12px !important;
          }
          .project-header h1 {
            font-size: 18px !important;
          }
          .header-actions {
            width: 100%;
            justify-content: flex-start !important;
          }
          .view-buttons {
            order: -1;
            width: 100%;
            margin-bottom: 8px;
          }
        }
      `}</style>
      <header className="project-header" style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexShrink: 0, 
        gap: 16, 
        flexWrap: 'wrap',
        padding: '12px 16px',
        borderRadius: 12,
        background: headerColors.background,
        transition: 'all 0.3s ease'
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/" style={{ color: headerColors.text, textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, transition: 'opacity 0.2s', opacity: 0.8 }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
        >← Back</a>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: headerColors.text }}>
          {project.name}
          {project.archived && (
            <span style={{ 
              marginLeft: 12, 
              padding: '4px 12px', 
              background: 'rgba(107, 114, 128, 0.2)', 
              color: headerColors.text, 
              borderRadius: 6, 
              fontSize: 13, 
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>Archived</span>
          )}
        </h1>
      </div>
      
      <div className="header-actions" style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Tools Dropdown Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid rgba(0, 0, 0, 0.1)`,
              background: 'rgba(255, 255, 255, 0.2)',
              color: headerColors.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
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
                  {canUseTemplates ? (
                    <span>Templates</span>
                  ) : (
                    <span style={{ opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span>Templates</span>
                      <span style={{ fontSize: 12, background: '#f3f4f6', color: '#6b7280', padding: '2px 6px', borderRadius: 6 }}>🔒</span>
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Workflows Button */}
        {canUseWorkflows ? (
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
        ) : (
          <button
            disabled
            title="Available on Pro"
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: 0.9
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            Workflows 🔒
          </button>
        )}

        {/* View Switcher */}
        <div className="view-buttons" style={{ 
          display: 'flex', 
          gap: 4, 
          padding: '4px 8px',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.2)',
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
                  background: currentView === view.id ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                  color: headerColors.text,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  minWidth: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: currentView === view.id ? 1 : 0.8
                }}
                onMouseEnter={(e) => {
                  if (currentView !== view.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.opacity = '1'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== view.id) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.opacity = '0.8'
                  }
                }}
              >
                {view.icon}
              </button>
            )

            // Handle premium views inline to avoid full-screen overlays
            if (view.feature) {
              let allowed = false
              if (view.feature === 'calendar_view') allowed = canUseCalendar
              if (view.feature === 'table_view') allowed = canUseTable
              if (view.feature === 'timeline_view') allowed = canUseTimeline

              if (allowed) return button

              return (
                <button
                  key={view.id}
                  disabled
                  title="Available on Pro"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.35)',
                    cursor: 'default',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7
                  }}
                >
                  {view.icon}
                </button>
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
    </>
  )
}
