import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import Navbar from '../../../components/Navbar'
import { useOrganization } from '../../../hooks/useOrganization'

export default function OrganizationSettings() {
  const router = useRouter()
  const { id } = router.query
  const { data: session } = useSession()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteEmailSent, setInviteEmailSent] = useState<boolean | null>(null)
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null)
  const [managingMember, setManagingMember] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<Record<string, boolean>>({})
  const [removingMember, setRemovingMember] = useState<Record<string, boolean>>({})
  const [showMemberOptions, setShowMemberOptions] = useState<Record<string, boolean>>({})
  const [cancellingInvite, setCancellingInvite] = useState<Record<string, boolean>>({})

  // Use SWR hook for caching
  const { organization, isLoading, mutate } = useOrganization(id as string)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) return

    setInviting(true)
    try {
      const res = await fetch(`/api/organizations/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to send invitation')
        setInviting(false)
        return
      }

      setInviteLink(data.inviteLink)
      // server now returns whether an email was actually sent
      setInviteEmailSent(typeof data.emailSent === 'boolean' ? data.emailSent : null)
      setInviteEmailError(data.emailError || null)
      setInviteEmail('')
      
      // Revalidate organization data
      mutate()
    } catch (err) {
      alert('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    if (!confirm(`Are you sure you want to change this member's role to ${newRole}?`)) return

    setChangingRole(prev => ({ ...prev, [memberId]: true }))
    try {
      const res = await fetch(`/api/organizations/${id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to change role')
        return
      }

      mutate()
      setShowMemberOptions(prev => ({ ...prev, [memberId]: false }))
    } catch (err) {
      alert('Failed to change role')
    } finally {
      setChangingRole(prev => ({ ...prev, [memberId]: false }))
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Are you sure you want to remove ${memberName} from the organization? This action cannot be undone.`)) return

    setRemovingMember(prev => ({ ...prev, [memberId]: true }))
    try {
      const res = await fetch(`/api/organizations/${id}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to remove member')
        return
      }

      mutate()
      setShowMemberOptions(prev => ({ ...prev, [memberId]: false }))
    } catch (err) {
      alert('Failed to remove member')
    } finally {
      setRemovingMember(prev => ({ ...prev, [memberId]: false }))
    }
  }

  async function handleCancelInvite(invitationId: string, email: string) {
    if (!confirm(`Cancel invitation to ${email}?`)) return

    setCancellingInvite(prev => ({ ...prev, [invitationId]: true }))
    try {
      const res = await fetch(`/api/organizations/${id}/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to cancel invitation')
        return
      }

      mutate()
    } catch (err) {
      alert('Failed to cancel invitation')
    } finally {
      setCancellingInvite(prev => ({ ...prev, [invitationId]: false }))
    }
  }

  if (isLoading) return <div style={{ padding: 24 }}>Loading...</div>

  if (!organization) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 24 }}>Organization not found</div>
      </>
    )
  }

  const userMembership = organization.members.find((m: any) => m.user.email === session?.user?.email)
  const isAdmin = userMembership?.role === 'admin'

  // Get plan display info
  const getPlanDisplay = (planId: string | null) => {
    if (!planId) return { name: 'Free Plan', color: '#9ca3af', bgColor: '#f3f4f6' }
    
    if (planId === 'free') {
      return { name: 'Free Plan', color: '#6b7280', bgColor: '#f3f4f6' }
    } else if (planId.includes('pro') || planId.includes('P-')) {
      return { name: 'Pro Plan', color: '#1e40af', bgColor: '#dbeafe' }
    } else if (planId === 'enterprise') {
      return { name: 'Enterprise Plan', color: '#6d28d9', bgColor: '#ede9fe' }
    } else {
      return { name: 'Free Plan', color: '#6b7280', bgColor: '#f3f4f6' }
    }
  }

  const planDisplay = getPlanDisplay(organization.planId)

  return (
    <>
      <Navbar />
      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>← Back to Projects</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h1 style={{ margin: 0 }}>{organization.name}</h1>
          <span style={{
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            background: planDisplay.bgColor,
            color: planDisplay.color,
            border: `1px solid ${planDisplay.color}20`
          }}>
            {planDisplay.name}
          </span>
        </div>
        <p style={{ color: '#6b7280' }}>Manage your organization settings and team members</p>
        
        {isAdmin && (
          <div style={{ marginTop: 16, marginBottom: 24, display: 'flex', gap: 12 }}>
            <a href={`/organizations/${organization.id}/billing`} style={{ 
              padding: '12px 20px', 
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
              color: 'white', 
              borderRadius: 8, 
              textDecoration: 'none', 
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-block',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}>💳 Manage Billing & Plans</a>
            <a href={`/organizations/${organization.id}/settings`} style={{ 
              padding: '12px 20px', 
              background: '#f3f4f6', 
              color: '#1f2937', 
              borderRadius: 8, 
              textDecoration: 'none', 
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-block',
              border: '1px solid #e5e7eb'
            }} onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb'
            }} onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
            }}>⚙️ Team Settings</a>
          </div>
        )}

        {/* Team Members */}
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Team Members ({organization.members.length})</h2>
          
          <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            {organization.members.map((member: any) => {
              const isCurrentUser = member.user.email === session?.user?.email
              const isAdmin = userMembership?.role === 'admin'
              
              return (
                <div key={member.id} style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {member.user.name || member.user.email}
                      {isCurrentUser && <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>(You)</span>}
                    </div>
                    {member.user.name && <div style={{ fontSize: 14, color: '#6b7280' }}>{member.user.email}</div>}
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: member.role === 'admin' ? '#fef3c7' : '#e0e7ff',
                      color: member.role === 'admin' ? '#92400e' : '#3730a3'
                    }}>
                      {member.role}
                    </span>
                    
                    {isAdmin && !isCurrentUser && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowMemberOptions(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                          style={{
                            padding: '6px 12px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#374151',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e5e7eb'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f3f4f6'
                          }}
                        >
                          ⋮ Manage
                        </button>
                        
                        {showMemberOptions[member.id] && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: 8,
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            zIndex: 10,
                            minWidth: 160
                          }}>
                            {member.role !== 'admin' ? (
                              <button
                                onClick={() => handleChangeRole(member.id, 'admin')}
                                disabled={changingRole[member.id]}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: 'transparent',
                                  border: 'none',
                                  textAlign: 'left',
                                  cursor: changingRole[member.id] ? 'not-allowed' : 'pointer',
                                  fontSize: 14,
                                  color: '#374151',
                                  opacity: changingRole[member.id] ? 0.6 : 1,
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f3f4f6'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                👑 Make Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleChangeRole(member.id, 'member')}
                                disabled={changingRole[member.id]}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: 'transparent',
                                  border: 'none',
                                  textAlign: 'left',
                                  cursor: changingRole[member.id] ? 'not-allowed' : 'pointer',
                                  fontSize: 14,
                                  color: '#374151',
                                  opacity: changingRole[member.id] ? 0.6 : 1,
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f3f4f6'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                👤 Demote to Member
                              </button>
                            )}
                            <div style={{ borderTop: '1px solid #e5e7eb' }} />
                            <button
                              onClick={() => handleRemoveMember(member.id, member.user.name || member.user.email)}
                              disabled={removingMember[member.id]}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                cursor: removingMember[member.id] ? 'not-allowed' : 'pointer',
                                fontSize: 14,
                                color: '#dc2626',
                                opacity: removingMember[member.id] ? 0.6 : 1,
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fef2f2'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              {removingMember[member.id] ? '⏳ Removing...' : '🗑️ Remove Member'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Pending Invitations */}
        {isAdmin && organization.invitations && organization.invitations.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Pending Invitations ({organization.invitations.length})</h2>
            
            <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              {organization.invitations.map((inv: any) => (
                <div key={inv.id} style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{inv.email}</div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      Invited {new Date(inv.createdAt).toLocaleDateString()} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: '#e0e7ff',
                      color: '#3730a3'
                    }}>
                      {inv.role}
                    </span>
                    <button
                      onClick={() => handleCancelInvite(inv.id, inv.email)}
                      disabled={cancellingInvite[inv.id]}
                      style={{
                        padding: '6px 12px',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: 6,
                        cursor: cancellingInvite[inv.id] ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#dc2626',
                        transition: 'all 0.2s',
                        opacity: cancellingInvite[inv.id] ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!cancellingInvite[inv.id]) {
                          e.currentTarget.style.background = '#fecaca'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!cancellingInvite[inv.id]) {
                          e.currentTarget.style.background = '#fee2e2'
                        }
                      }}
                    >
                      {cancellingInvite[inv.id] ? '⏳ Cancelling...' : '✕ Cancel'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Invite New Member */}
        {isAdmin && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Invite Team Member</h2>
            
            <form onSubmit={handleInvite} style={{ background: 'white', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviting}
                  style={{
                    padding: '10px 20px',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: inviting ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: inviting ? 0.6 : 1
                  }}
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>

              {inviteLink && (
                <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6 }}>
                      <p style={{ margin: 0, marginBottom: 8, fontWeight: 600, color: '#166534' }}>
                        {inviteEmailSent === true ? '✓ Invitation sent!' : inviteEmailSent === false ? 'Invitation created — email not sent' : 'Invitation created'}
                      </p>
                      <p style={{ margin: 0, fontSize: 14, color: inviteEmailSent === false ? '#92400e' : '#15803d' }}>
                        {inviteEmailSent === true ? 'An email was sent to the recipient. You can also share this link:' : inviteEmailSent === false ? 'Email could not be sent — copy and share this link manually:' : 'Share this link with your team member:'}
                      </p>
                      {inviteEmailError && (
                        <div style={{ marginTop: 8, padding: 8, background: '#fff7ed', border: '1px solid #ffd8a8', borderRadius: 6, color: '#92400e' }}>
                          {inviteEmailError}
                        </div>
                      )}
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    onClick={(e) => e.currentTarget.select()}
                    style={{ width: '100%', padding: 8, marginTop: 8, borderRadius: 4, border: '1px solid #86efac', background: 'white', fontSize: 12 }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink)
                      alert('Link copied to clipboard!')
                    }}
                    style={{ marginTop: 8, padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </form>
          </section>
        )}

        {/* Projects */}
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Projects ({organization.projects.length})</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {organization.projects.map((project: any) => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                style={{
                  padding: 16,
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{project.name}</div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                  Owner: {project.owner?.name || project.owner?.email}
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
