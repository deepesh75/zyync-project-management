import React, { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { useProjects, useOrganizations } from '../hooks/useProjects'

type Project = {
  id: string
  name: string
  archived?: boolean
  archivedAt?: string
  tasks?: any[]
  owner?: any
}

type Organization = {
  id: string
  name: string
  role: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const [name, setName] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [showArchived, setShowArchived] = useState(false)

  // Use SWR hooks for caching - only when authenticated
  const shouldFetch = status === 'authenticated'
  const { projects, mutate: mutateProjects } = useProjects(showArchived, shouldFetch)
  const { organizations, mutate: mutateOrgs } = useOrganizations(shouldFetch)

  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organizations[0].id)
    }
  }, [organizations, selectedOrgId])

  async function create() {
    if (!name) return
    const body: any = { name }
    if (selectedOrgId) {
      body.organizationId = selectedOrgId
    }
    
    // Optimistic update
    const tempProject = { id: 'temp', name, archived: false, tasks: [] }
    mutateProjects(projects ? [tempProject, ...projects] : [tempProject], false)
    
    const res = await fetch('/api/projects', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    })
    const project = await res.json()
    setName('')
    
    // Revalidate
    mutateProjects()
  }

  async function toggleArchive(projectId: string, currentlyArchived: boolean, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    // Optimistic update
    if (projects) {
      const optimisticProjects = projects.map((p: any) => 
        p.id === projectId ? { ...p, archived: !currentlyArchived } : p
      )
      mutateProjects(optimisticProjects, false)
    }
    
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !currentlyArchived })
      })
      mutateProjects()
    } catch (err) {
      alert('Failed to update project')
      mutateProjects()
    }
  }

  async function deleteProject(projectId: string, projectName: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return
    }

    // Optimistic update
    if (projects) {
      mutateProjects(projects.filter((p: any) => p.id !== projectId), false)
    }

    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      mutateProjects()
    } catch (err) {
      alert('Failed to delete project')
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        flexDirection: 'column',
        gap: 20
      }}>
        <div style={{
          width: 50,
          height: 50,
          border: '4px solid var(--border)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <Navbar />
        <main style={{ 
          padding: '80px 24px', 
          fontFamily: 'Arial, sans-serif', 
          maxWidth: 600, 
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontSize: 48, 
            fontWeight: 800, 
            marginBottom: 16,
            background: 'linear-gradient(to right, var(--gradient-start), var(--gradient-end))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px'
          }}>Welcome to Zyync</h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>Streamline your team's workflow with powerful project management tools designed for modern startups.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button 
              onClick={() => signIn()} 
              style={{ 
                padding: '12px 24px', 
                background: 'linear-gradient(to right, var(--gradient-start), var(--gradient-end))', 
                color: 'white', 
                border: 'none', 
                borderRadius: 8, 
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}>Sign in</button>
            <a 
              href="/auth/signup" 
              style={{ 
                padding: '12px 24px', 
                background: 'var(--surface)', 
                color: 'var(--primary)',
                border: '2px solid var(--primary)',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: 600,
                display: 'inline-block'
              }}>Sign up</a>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <style jsx>{`
        @media (max-width: 768px) {
          .home-main {
            padding: 20px 16px !important;
          }
          .home-title {
            font-size: 20px !important;
          }
          .org-grid {
            grid-template-columns: 1fr !important;
          }
          .project-grid {
            grid-template-columns: 1fr !important;
          }
          .create-form {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .create-form input,
          .create-form select,
          .create-form button {
            width: 100% !important;
            max-width: none !important;
          }
        }
      `}</style>
      <main className="home-main" style={{ 
        padding: '32px 24px', 
        fontFamily: 'inherit', 
        maxWidth: 1400, 
        margin: '0 auto',
        minHeight: 'calc(100vh - 100px)'
      }}>
        
        {/* Organizations Section */}
        {organizations && organizations.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 className="home-title" style={{ 
              margin: 0, 
              marginBottom: 20, 
              fontSize: 22, 
              fontWeight: 700, 
              color: 'var(--text)',
              letterSpacing: '-0.02em'
            }}>Your Organizations</h2>
            <div className="org-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {organizations.map((org: any) => (
                <div key={org.id} style={{ 
                  background: 'var(--surface)', 
                  border: '2px solid var(--border)', 
                  borderRadius: 12, 
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{org.name}</h3>
                    </div>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: org.role === 'admin' ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      color: org.role === 'admin' ? '#92400e' : '#1e40af'
                    }}>
                      {org.role}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={`/organizations/${org.id}/settings`} style={{ 
                      flex: 1,
                      padding: '10px 12px', 
                      background: '#f3f4f6', 
                      color: '#1f2937', 
                      borderRadius: 8, 
                      textDecoration: 'none', 
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: 'center',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb'
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                    }}>⚙️ Settings</a>
                    {org.role === 'admin' && (
                      <a href={`/organizations/${org.id}/billing`} style={{ 
                        flex: 1,
                        padding: '10px 12px', 
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white', 
                        borderRadius: 8, 
                        textDecoration: 'none', 
                        fontSize: 13,
                        fontWeight: 600,
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }} onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }} onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}>💳 Billing</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 className="home-title" style={{ 
            margin: 0, 
            fontSize: 24, 
            fontWeight: 700, 
            color: 'var(--text)',
            letterSpacing: '-0.02em'
          }}>My Projects</h1>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            cursor: 'pointer', 
            fontSize: 13, 
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={(e) => setShowArchived(e.target.checked)}
              style={{ 
                cursor: 'pointer',
                width: 16,
                height: 16,
                accentColor: 'var(--primary)'
              }}
            />
            Show archived
          </label>
        </div>
        
        <div className="create-form" style={{ 
          marginBottom: 32, 
          display: 'flex', 
          gap: 12, 
          alignItems: 'center',
          background: 'var(--surface)',
          padding: '18px',
          borderRadius: 12,
          border: '2px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {organizations && organizations.length > 0 && (
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              style={{ 
                padding: '11px 16px', 
                borderRadius: 10, 
                border: '1.5px solid var(--border)', 
                minWidth: 220, 
                fontSize: 14,
                fontWeight: 500,
                background: 'var(--surface)',
                color: 'var(--text)'
              }}
            >
              <option value="">📁 Personal Project</option>
              {organizations.map((org: any) => (
                <option key={org.id} value={org.id}>🏢 {org.name}</option>
              ))}
            </select>
          )}
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Enter project name..." 
            style={{ 
              flex: 1, 
              padding: '11px 16px', 
              borderRadius: 10, 
              border: '1.5px solid var(--border)', 
              fontSize: 14,
              fontWeight: 500
            }}
          />
          <button 
            onClick={create} 
            style={{ 
              padding: '11px 24px', 
              background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-end))', 
              color: 'white', 
              border: 'none', 
              borderRadius: 10, 
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(79, 70, 229, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            ✨ Create Project
          </button>
        </div>
        <div className="project-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {projects && projects.map((p: any) => {
            // Get unique users from project tasks
            const projectUsers = new Map()
            p.tasks?.forEach((task: any) => {
              task.members?.forEach((member: any) => {
                if (member.user) {
                  projectUsers.set(member.user.id, member.user)
                }
              })
            })
            // Add owner
            if (p.owner) {
              projectUsers.set(p.owner.id, p.owner)
            }
            const uniqueUsers = Array.from(projectUsers.values())
            
            return (
              <Link 
                key={p.id} 
                href={`/projects/${p.id}`}
                prefetch={true}
                style={{ 
                  padding: 20, 
                  background: 'var(--surface)', 
                  border: '2px solid var(--border)', 
                  borderRadius: 14,
                  textDecoration: 'none',
                  color: 'var(--text)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-xl)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, flex: 1, letterSpacing: '-0.01em' }}>
                    {p.name}
                    {p.archived && (
                      <span style={{ 
                        marginLeft: 12, 
                        padding: '6px 12px', 
                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', 
                        color: '#6b7280', 
                        borderRadius: 8, 
                        fontSize: 11, 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        border: '1px solid #d1d5db'
                      }}>📁 Archived</span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={(e) => toggleArchive(p.id, !!p.archived, e)}
                      title={p.archived ? 'Unarchive' : 'Archive'}
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-secondary)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fef3c7'
                        e.currentTarget.style.color = '#92400e'
                        e.currentTarget.style.borderColor = '#fde68a'
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-secondary)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      {p.archived ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="21 8 21 21 3 21 3 8"></polyline>
                          <rect x="1" y="3" width="22" height="5"></rect>
                          <line x1="10" y1="12" x2="14" y2="12"></line>
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => deleteProject(p.id, p.name, e)}
                      title="Delete project"
                      style={{
                        padding: '8px 10px',
                        background: 'var(--bg-secondary)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee2e2'
                        e.currentTarget.style.color = '#dc2626'
                        e.currentTarget.style.borderColor = '#fecaca'
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-secondary)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* User Avatars */}
                {uniqueUsers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ display: 'flex', marginLeft: -4 }}>
                      {uniqueUsers.slice(0, 5).map((user: any, idx: number) => {
                        const initials = (user.name || user.email)
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                        
                        const colors = [
                          { bg: 'linear-gradient(135deg, #fecaca 0%, #f87171 100%)', text: '#7f1d1d', border: '#fca5a5' },
                          { bg: 'linear-gradient(135deg, #bfdbfe 0%, #60a5fa 100%)', text: '#1e3a8a', border: '#93c5fd' },
                          { bg: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 100%)', text: '#78350f', border: '#fcd34d' },
                          { bg: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)', text: '#064e3b', border: '#6ee7b7' },
                          { bg: 'linear-gradient(135deg, #c7d2fe 0%, #818cf8 100%)', text: '#312e81', border: '#a5b4fc' }
                        ]
                        const colorIndex = user.id.charCodeAt(0) % colors.length
                        const color = colors[colorIndex]
                        
                        return (
                          <div
                            key={user.id}
                            title={user.name || user.email}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: color.bg,
                              color: color.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              border: `2.5px solid var(--surface)`,
                              marginLeft: idx > 0 ? -10 : 0,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                              position: 'relative',
                              zIndex: 5 - idx,
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.15) translateY(-2px)'
                              e.currentTarget.style.zIndex = '10'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.zIndex = String(5 - idx)
                            }}
                          >
                            {initials}
                          </div>
                        )
                      })}
                      {uniqueUsers.length > 5 && (
                        <div
                          title={`+${uniqueUsers.length - 5} more`}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: '#f3f4f6',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            border: '2px solid white',
                            marginLeft: -8,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          +{uniqueUsers.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
        
        {/* Empty State */}
        {projects.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 40px',
            background: 'var(--surface)',
            borderRadius: 18,
            border: '2px dashed var(--border)',
            marginTop: 40
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>📋</div>
            <h3 style={{ 
              margin: 0, 
              marginBottom: 12, 
              fontSize: 22, 
              fontWeight: 700, 
              color: 'var(--text)',
              letterSpacing: '-0.02em'
            }}>No projects yet</h3>
            <p style={{ 
              margin: 0, 
              fontSize: 15, 
              color: 'var(--text-secondary)',
              maxWidth: 400,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6
            }}>
              Create your first project above to get started with organizing your tasks and collaborating with your team.
            </p>
          </div>
        )}
      </main>
    </>
  )
}
