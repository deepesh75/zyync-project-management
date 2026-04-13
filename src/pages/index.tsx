import React, { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
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
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [showArchived, setShowArchived] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (router.query.payment === 'success') {
      setPaymentSuccess(true)
      router.replace('/', undefined, { shallow: true })
      const t = setTimeout(() => setPaymentSuccess(false), 6000)
      return () => clearTimeout(t)
    }
  }, [router.query.payment])

  // Use SWR hooks for caching - only when authenticated
  const shouldFetch = status === 'authenticated'
  const { projects, isLoading: projectsLoading, isError: projectsError, mutate: mutateProjects } = useProjects(showArchived, shouldFetch)
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
    
    const res = await fetch('/api/projects', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    })
    const project = await res.json()
    setName('')
    
    // Revalidate and navigate to the real project
    mutateProjects()
    if (project?.id) {
      router.push(`/projects/${project.id}`)
    }
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

  // Color palette for project cards
  const cardAccents = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #06b6d4, #3b82f6)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #14b8a6, #06b6d4)',
  ]

  const firstName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'there'

  return (
    <>
      <Navbar />
      {paymentSuccess && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#22c55e', color: '#fff', padding: '12px 24px',
          borderRadius: 10, zIndex: 9999, fontWeight: 600, fontSize: 15,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span>✓</span> Payment successful — welcome to your plan!
        </div>
      )}
      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .home-page {
          min-height: calc(100vh - 60px);
          background: var(--bg-primary);
          background-image: radial-gradient(circle at 20% 20%, rgba(99,102,241,0.07) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 50%);
        }

        .page-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 32px;
          animation: fadeUp 0.4s ease;
        }
        .section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 14px;
        }
        .project-card-accent {
          height: 4px;
          border-radius: 4px 4px 0 0;
          position: absolute;
          top: 0; left: 0; right: 0;
        }
        @media (max-width: 768px) {

          .page-content { padding: 20px 16px !important; }
          .org-grid { grid-template-columns: 1fr !important; }
          .project-grid { grid-template-columns: 1fr !important; }
          .create-form { flex-direction: column !important; gap: 10px !important; }
          .create-form input,
          .create-form select,
          .create-form button { width: 100% !important; max-width: none !important; }
        }
      `}</style>

      <div className="home-page">
        <div className="page-content">

        {/* Organizations Section */}
        {organizations && organizations.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <p className="section-label">Your Organizations</p>
            <div className="org-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {organizations.map((org: any) => (
                <div key={org.id} style={{ 
                  background: 'var(--surface)', 
                  border: '1.5px solid var(--border)', 
                  borderRadius: 14, 
                  padding: '18px 20px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: 'white'
                    }}>{org.name.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{org.name}</h3>
                      <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: org.role === 'admin' ? '#f59e0b' : 'var(--text-secondary)'
                      }}>{org.role}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <a href={`/organizations/${org.id}/settings`} style={{ 
                      padding: '8px 14px', 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text)', 
                      borderRadius: 8, 
                      textDecoration: 'none', 
                      fontSize: 13, fontWeight: 600,
                      border: '1.5px solid var(--border)',
                      transition: 'all 0.2s'
                    }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}>Settings</a>
                    {org.role === 'admin' && (
                      <a href={`/organizations/${org.id}/billing`} style={{ 
                        padding: '8px 14px', 
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: 'white', borderRadius: 8, textDecoration: 'none', 
                        fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
                      }}>Billing</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Projects Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 4 }}>My Projects</p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {showArchived ? 'All Projects' : 'Active Projects'}
            </h2>
          </div>
          <label style={{ 
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: 8, padding: '7px 12px'
          }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)}
              style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--primary)' }} />
            Show archived
          </label>
        </div>

        {/* Create Project Form */}
        <div className="create-form" style={{ 
          marginBottom: 28, display: 'flex', gap: 10, alignItems: 'center',
          background: 'var(--surface)',
          padding: '14px 16px',
          borderRadius: 14,
          border: '1.5px solid var(--border)',
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
        <div className="project-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 18 }}>
          {projects && projects.map((p: any, index: number) => {
            const accentGradient = cardAccents[index % cardAccents.length]
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
                  padding: 0,
                  paddingTop: 4,
                  background: 'var(--surface)', 
                  border: '1.5px solid var(--border)', 
                  borderRadius: 14,
                  textDecoration: 'none',
                  color: 'var(--text)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 16px 32px rgba(0,0,0,0.15)'
                  e.currentTarget.style.borderColor = 'var(--primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                {/* Color accent bar */}
                <div style={{ height: 4, background: accentGradient, borderRadius: '14px 14px 0 0' }} />

                <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
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

                {/* Task count strip */}
                {(() => {
                  const total = p.tasks?.length || 0
                  const done = p.tasks?.filter((t: any) => t.status === 'done').length || 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return total > 0 ? (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{done}/{total} tasks done</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: accentGradient, borderRadius: 4, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  ) : null
                })()}
                </div>
              </Link>
            )
          })}
        </div>
        
        {/* Empty State */}
        {projectsError && (
          <div style={{
            textAlign: 'center',
            padding: '60px 40px',
            background: '#fef2f2',
            borderRadius: 18,
            border: '2px dashed #fca5a5',
            marginTop: 40
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 18, fontWeight: 700, color: '#991b1b' }}>Failed to load projects</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#b91c1c', marginBottom: 16 }}>{projectsError.message || 'Unknown error'}</p>
            <button onClick={() => mutateProjects()} style={{ padding: '8px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry</button>
          </div>
        )}
        {!projectsError && projectsLoading && (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-secondary)', fontSize: 15 }}>Loading projects...</div>
        )}
        {!projectsError && !projectsLoading && projects.length === 0 && (
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
        </div>{/* end page-content */}
      </div>{/* end home-page */}
    </>
  )
}
