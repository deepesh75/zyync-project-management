import React, { useState } from 'react'
import { useTaskTemplates } from '../hooks/useTaskTemplates'

interface ManageTemplatesProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export default function ManageTemplates({ projectId, isOpen, onClose }: ManageTemplatesProps) {
  const { templates, createTemplate, updateTemplate, deleteTemplate, isLoading } = useTaskTemplates(projectId)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    priority: 'medium',
    coverColor: null,
    labelIds: [],
    defaultAssigneeId: null,
    defaultMembers: [],
    dueOffsetDays: null
  })

  const handleAddTemplate = async () => {
    if (!formData.name.trim()) return
    
    try {
      await createTemplate(formData)
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        coverColor: null,
        labelIds: [],
        defaultAssigneeId: null,
        defaultMembers: [],
        dueOffsetDays: null
      })
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate?.id || !formData.name.trim()) return
    
    try {
      await updateTemplate(editingTemplate.id, formData)
      setEditingTemplate(null)
      setFormData({
        name: '',
        description: '',
        priority: 'medium',
        coverColor: null,
        labelIds: [],
        defaultAssigneeId: null,
        defaultMembers: [],
        dueOffsetDays: null
      })
    } catch (error) {
      console.error('Failed to update template:', error)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      await deleteTemplate(templateId)
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const startEdit = (template: any) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || '',
      priority: template.priority || 'medium',
      coverColor: template.coverColor || null,
      labelIds: template.labelIds || [],
      defaultAssigneeId: template.defaultAssigneeId || null,
      defaultMembers: template.defaultMembers || [],
      dueOffsetDays: template.dueOffsetDays || null
    })
  }

  const cancelEdit = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      coverColor: null,
      labelIds: [],
      defaultAssigneeId: null,
      defaultMembers: [],
      dueOffsetDays: null
    })
  }

  if (!isOpen) return null

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
        maxWidth: 600,
        maxHeight: '90vh',
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
            Manage Task Templates
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
          {/* Form */}
          <div style={{
            padding: 16,
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            marginBottom: 24
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase' }}>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                placeholder="Template name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14
                }}
              />

              <textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14,
                  minHeight: 60,
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />

              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14
                }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>

              <input
                type="number"
                placeholder="Due offset (days from creation)"
                value={formData.dueOffsetDays || ''}
                onChange={(e) => setFormData({ ...formData, dueOffsetDays: e.target.value ? parseInt(e.target.value) : null })}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14
                }}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={editingTemplate ? handleUpdateTemplate : handleAddTemplate}
                  disabled={!formData.name.trim()}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    background: formData.name.trim() ? 'var(--primary)' : 'var(--text-secondary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: formData.name.trim() ? 'pointer' : 'not-allowed',
                    opacity: formData.name.trim() ? 1 : 0.6,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.name.trim()) {
                      e.currentTarget.style.opacity = '0.9'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.name.trim()) {
                      e.currentTarget.style.opacity = '1'
                    }
                  }}
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
                {editingTemplate && (
                  <button
                    onClick={cancelEdit}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
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
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Templates List */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase' }}>
              Your Templates ({templates.length})
            </h3>

            {isLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                Loading...
              </div>
            ) : templates.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                No templates yet. Create one above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    style={{
                      padding: 12,
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {template.name}
                      </div>
                      {template.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {template.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => startEdit(template)}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
