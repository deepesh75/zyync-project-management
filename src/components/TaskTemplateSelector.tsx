import React, { useState } from 'react'
import { useTaskTemplates } from '../hooks/useTaskTemplates'

interface TaskTemplateSelector {
  projectId: string
  onSelectTemplate: (template: any) => void
  onClose: () => void
}

export default function TaskTemplateSelector({ projectId, onSelectTemplate, onClose }: TaskTemplateSelector) {
  const { templates, isLoading } = useTaskTemplates(projectId)
  const [showTemplates, setShowTemplates] = useState(true)

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--modal-backdrop)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease'
        }}
      />
      
      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--surface)',
        borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        zIndex: 2001,
        width: '90%',
        maxWidth: 500,
        maxHeight: '80vh',
        overflow: 'auto',
        animation: 'slideUp 0.3s ease',
        border: '1px solid var(--border)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'var(--surface)',
          borderRadius: '16px 16px 0 0'
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
            {showTemplates ? 'Select a Template' : 'Create from Scratch'}
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
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No templates yet. Create a task from scratch or create your first template!</p>
              <button
                onClick={() => onSelectTemplate(null)}
                style={{
                  marginTop: 16,
                  padding: '10px 20px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Create Task from Scratch
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {templates.map((template: any) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  style={{
                    padding: 16,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-light)'
                    e.currentTarget.style.borderColor = 'var(--primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                      {template.name}
                    </div>
                    {template.description && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {template.description}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {template.priority && (
                        <span>Priority: <strong>{template.priority}</strong></span>
                      )}
                      {template.labelIds?.length > 0 && (
                        <span>Labels: <strong>{template.labelIds.length}</strong></span>
                      )}
                      {template.defaultAssigneeId && (
                        <span>Assigned</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}>→</span>
                </button>
              ))}

              {/* Create from scratch option */}
              <button
                onClick={() => onSelectTemplate(null)}
                style={{
                  padding: 16,
                  background: 'transparent',
                  border: '2px dashed var(--border)',
                  borderRadius: 10,
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)'
                  e.currentTarget.style.color = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                + Create from Scratch
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
