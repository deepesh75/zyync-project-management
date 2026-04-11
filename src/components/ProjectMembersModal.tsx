import { useState, useEffect } from 'react'
import type { NextApiRequest, NextApiResponse } from 'next'

interface ProjectMember {
  projectId: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string
  }
  addedAt: string
}

interface ProjectMembersModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
  isOwner: boolean
}

export default function ProjectMembersModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  isOwner
}: ProjectMembersModalProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isFetching, setIsFetching] = useState(false)

  // Fetch members when modal opens
  useEffect(() => {
    if (isOpen && isOwner) {
      fetchMembers()
    }
  }, [isOpen, projectId, isOwner])

  const fetchMembers = async () => {
    setIsFetching(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data)
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setIsFetching(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newMemberEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`✓ ${newMemberEmail} added successfully!`)
        setNewMemberEmail('')
        fetchMembers()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to add member')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string, memberEmail: string) => {
    if (!window.confirm(`Remove ${memberEmail} from this project?`)) return

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (res.ok) {
        setSuccess(`Removed ${memberEmail}`)
        fetchMembers()
        setTimeout(() => setSuccess(''), 2000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to remove member')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        padding: 0,
        maxWidth: 500,
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: '0 0 4px 0',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text)'
            }}>
              Team Members
            </h2>
            <p style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--text-secondary)'
            }}>
              {projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 24,
              color: 'var(--text-secondary)',
              padding: 0,
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {/* Add Member Form */}
          {isOwner && (
            <form onSubmit={handleAddMember} style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: 8
              }}>
                Add Team Member
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: 14,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '# 667eea'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '10px 20px',
                    background: isLoading ? 'var(--border)' : '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.background = '#5568d3'
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) e.currentTarget.style.background = '#667eea'
                  }}
                >
                  {isLoading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          )}

          {/* Messages */}
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: '#991b1b'
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              background: '#d1fae5',
              border: '1px solid #6ee7b7',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: '#065f46'
            }}>
              {success}
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: 0.7
            }}>
              Members ({members.length})
            </h3>
            
            {isFetching ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: 'var(--text-secondary)'
              }}>
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: 'var(--text-secondary)',
                fontSize: 14
              }}>
                No team members added yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((member) => (
                  <div
                    key={member.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'var(--bg)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg)'
                    }}
                  >
                    <div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text)',
                        marginBottom: 2
                      }}>
                        {member.user.name || member.user.email}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)'
                      }}>
                        {member.user.email}
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => handleRemoveMember(member.userId, member.user.email)}
                        style={{
                          padding: '6px 12px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: '1px solid #fca5a5',
                          borderRadius: 6,
                          fontWeight: 500,
                          fontSize: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fca5a5'
                          e.currentTarget.style.color = '#7c2d12'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fee2e2'
                          e.currentTarget.style.color = '#991b1b'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
