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
      setInviteEmail('')
      
      // Revalidate organization data
      mutate()
    } catch (err) {
      alert('Failed to send invitation')
    } finally {
      setInviting(false)
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

  return (
    <>
      <Navbar />
      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>← Back to Projects</a>
        </div>

        <h1>{organization.name}</h1>
        {isAdmin && (
          <div style={{ marginTop: 8 }}>
            <a href={`/organizations/${organization.id}/billing`} style={{ padding: '6px 10px', background: '#111827', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}>Manage Billing</a>
          </div>
        )}
        <p style={{ color: '#6b7280' }}>Manage your organization settings and team members</p>

        {/* Team Members */}
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Team Members ({organization.members.length})</h2>
          
          <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            {organization.members.map((member: any) => (
              <div key={member.id} style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{member.user.name || member.user.email}</div>
                  {member.user.name && <div style={{ fontSize: 14, color: '#6b7280' }}>{member.user.email}</div>}
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
                  {/* TODO: Add remove button for admins */}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Invitations */}
        {isAdmin && organization.invitations && organization.invitations.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Pending Invitations ({organization.invitations.length})</h2>
            
            <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              {organization.invitations.map((inv: any) => (
                <div key={inv.id} style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{inv.email}</div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>
                      Invited {new Date(inv.createdAt).toLocaleDateString()} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
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
                  <p style={{ margin: 0, marginBottom: 8, fontWeight: 600, color: '#166534' }}>✓ Invitation sent!</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#15803d' }}>Share this link with your team member:</p>
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
