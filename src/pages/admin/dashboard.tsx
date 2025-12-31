import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import Navbar from '../../components/Navbar'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [metrics, setMetrics] = useState<any>(null)
  const [billingIssues, setBillingIssues] = useState<any>(null)
  const [capacity, setCapacity] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'capacity' | 'revenue'>('overview')
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ type: 'user' | 'organization', id: string, name: string, email?: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const toggleOrgDetails = (orgId: string) => {
    setExpandedOrg(expandedOrg === orgId ? null : orgId)
  }

  async function handleDelete() {
    if (!deleteModal) return
    
    setDeleting(true)
    try {
      const endpoint = deleteModal.type === 'user' 
        ? `/api/admin/users/${deleteModal.id}`
        : `/api/admin/organizations/${deleteModal.id}`
      
      const res = await fetch(endpoint, { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        alert(`Successfully deleted ${deleteModal.type}: ${deleteModal.name}`)
        setDeleteModal(null)
        loadMetrics() // Reload data
      } else {
        alert(`Error: ${data.error || 'Failed to delete'}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('An error occurred while deleting')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      loadMetrics()
    }
  }, [status])

  async function loadMetrics() {
    setLoading(true)
    setError(null)
    try {
      const [metricsRes, billingRes, capacityRes, revenueRes] = await Promise.all([
        fetch('/api/admin/metrics?type=organizations'),
        fetch('/api/admin/metrics?type=billing'),
        fetch('/api/admin/metrics?type=capacity'),
        fetch('/api/admin/metrics?type=revenue')
      ])

      if (!metricsRes.ok) {
        const data = await metricsRes.json()
        setError(data.error || 'Access denied. Admin permissions required.')
        setLoading(false)
        return
      }

      const [metricsData, billingData, capacityData, revenueData] = await Promise.all([
        metricsRes.json(),
        billingRes.json(),
        capacityRes.json(),
        revenueRes.json()
      ])

      setMetrics(metricsData)
      setBillingIssues(billingData)
      setCapacity(capacityData)
      setRevenue(revenueData)
    } catch (err) {
      console.error('Failed to load metrics:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(cents / 100)
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40, textAlign: 'center' }}>
          <div>Loading admin dashboard...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444' }}>Access Denied</h1>
          <p>{error}</p>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 16 }}>
            Add your email to ADMIN_EMAILS environment variable to access this dashboard.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Admin Dashboard</h1>
            <p style={{ color: '#6b7280', margin: '8px 0 0' }}>Monitor seat usage, billing, and revenue</p>
          </div>
          <button 
            onClick={loadMetrics}
            style={{ 
              padding: '10px 20px', 
              background: '#4f46e5', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          borderBottom: '2px solid #e5e7eb',
          marginBottom: 24
        }}>
          {(['overview', 'billing', 'capacity', 'revenue'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #4f46e5' : '2px solid transparent',
                color: activeTab === tab ? '#4f46e5' : '#6b7280',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                fontSize: 14,
                marginBottom: -2
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && metrics && (
          <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
              <StatCard
                title="Total Organizations"
                value={metrics.totalOrgs}
                color="#4f46e5"
              />
              <StatCard
                title="Free Plan"
                value={metrics.byPlan.free}
                color="#6b7280"
              />
              <StatCard
                title="Pro Plan"
                value={metrics.byPlan.pro}
                color="#10b981"
              />
              <StatCard
                title="At Capacity"
                value={metrics.atCapacity}
                color="#f59e0b"
                warning={metrics.atCapacity > 0}
              />
            </div>

            {/* Seat Utilization Table */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Organization Seat Utilization</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Organization</th>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Plan</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Seats</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Utilization</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Members</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Pending</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Status</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280', minWidth: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.seatUtilization.slice(0, 20).map((org: any) => (
                      <React.Fragment key={org.id}>
                        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: 12, fontSize: 14 }}>{org.name}</td>
                          <td style={{ padding: 12, fontSize: 14 }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: org.planId === 'free' ? '#f3f4f6' : '#eef2ff',
                              color: org.planId === 'free' ? '#6b7280' : '#4f46e5'
                            }}>
                              {org.planId || 'free'}
                            </span>
                          </td>
                          <td style={{ padding: 12, textAlign: 'center', fontSize: 14 }}>
                            {org.seatsUsed} / {org.seatsAllowed}
                          </td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <div style={{ 
                              background: '#f3f4f6', 
                              borderRadius: 6, 
                              overflow: 'hidden',
                              height: 8,
                              position: 'relative'
                            }}>
                              <div style={{
                                width: `${Math.min(org.utilizationPercent, 100)}%`,
                                height: '100%',
                                background: org.utilizationPercent >= 100 ? '#ef4444' : org.utilizationPercent >= 80 ? '#f59e0b' : '#10b981',
                                transition: 'width 0.3s'
                              }}></div>
                            </div>
                            <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display: 'block' }}>
                              {org.utilizationPercent}%
                            </span>
                          </td>
                          <td style={{ padding: 12, textAlign: 'center', fontSize: 14 }}>{org.actualMembers}</td>
                          <td style={{ padding: 12, textAlign: 'center', fontSize: 14 }}>{org.pendingInvites}</td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: org.billingStatus === 'active' ? '#ecfdf5' : '#fef3c7',
                              color: org.billingStatus === 'active' ? '#10b981' : '#f59e0b'
                            }}>
                              {org.billingStatus || 'active'}
                            </span>
                          </td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <button
                                onClick={() => toggleOrgDetails(org.id)}
                                style={{
                                  padding: '8px 16px',
                                  background: expandedOrg === org.id ? '#4f46e5' : '#4f46e5',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#4f46e5'}
                              >
                                {expandedOrg === org.id ? '▲ Hide' : '▼ View'}
                              </button>
                              <button
                                onClick={() => setDeleteModal({ type: 'organization', id: org.id, name: org.name })}
                                style={{
                                  padding: '8px 16px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedOrg === org.id && (
                          <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td colSpan={8} style={{ padding: 20, background: '#f9fafb' }}>
                              <div style={{ marginBottom: 20 }}>
                                <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                  Active Members ({org.members?.length || 0})
                                </h3>
                                {org.members && org.members.length > 0 ? (
                                  <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                    {org.members.map((member: any, idx: number) => (
                                      <div 
                                        key={member.id}
                                        style={{
                                          padding: '12px 16px',
                                          borderBottom: idx < org.members.length - 1 ? '1px solid #f3f4f6' : 'none',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <div>
                                          <button
                                            onClick={() => setDeleteModal({ 
                                              type: 'user', 
                                              id: member.userId, 
                                              name: member.name || 'Unknown User',
                                              email: member.email 
                                            })}
                                            style={{
                                              padding: '4px 8px',
                                              background: '#fee2e2',
                                              color: '#ef4444',
                                              border: 'none',
                                              borderRadius: 6,
                                              fontSize: 11,
                                              cursor: 'pointer',
                                              fontWeight: 600
                                            }}
                                            title="Delete user"
                                          >
                                            🗑️
                                          </button>
                                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                            {member.name || 'Unknown User'}
                                          </div>
                                          <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>
                                            {member.email}
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                          <span style={{
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: member.role === 'admin' ? '#dbeafe' : '#f3f4f6',
                                            color: member.role === 'admin' ? '#1e40af' : '#6b7280'
                                          }}>
                                            {member.role}
                                          </span>
                                          <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                            {new Date(member.joinedAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ padding: 12, color: '#6b7280', fontSize: 14 }}>No active members</div>
                                )}
                              </div>

                              {org.pendingInvitations && org.pendingInvitations.length > 0 && (
                                <div>
                                  <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                    Pending Invitations ({org.pendingInvitations.length})
                                  </h3>
                                  <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                    {org.pendingInvitations.map((inv: any, idx: number) => (
                                      <div 
                                        key={inv.id}
                                        style={{
                                          padding: '12px 16px',
                                          borderBottom: idx < org.pendingInvitations.length - 1 ? '1px solid #f3f4f6' : 'none',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <div>
                                          <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>
                                            {inv.email}
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                          <span style={{
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: '#fef3c7',
                                            color: '#f59e0b'
                                          }}>
                                            pending
                                          </span>
                                          <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                            Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && billingIssues && (
          <div>
            <StatCard
              title="Billing Issues"
              value={billingIssues.totalIssues}
              color="#ef4444"
              warning={billingIssues.totalIssues > 0}
            />
            
            {billingIssues.organizations.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', marginTop: 20, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>Organizations with Billing Issues</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Organization</th>
                        <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Plan</th>
                        <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Status</th>
                        <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>Members</th>
                        <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>PayPal Sub ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingIssues.organizations.map((org: any) => (
                        <tr key={org.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: 12, fontSize: 14 }}>{org.name}</td>
                          <td style={{ padding: 12, fontSize: 14 }}>{org.planId || 'N/A'}</td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: org.billingStatus === 'past_due' ? '#fef3c7' : '#fee2e2',
                              color: org.billingStatus === 'past_due' ? '#f59e0b' : '#ef4444'
                            }}>
                              {org.billingStatus}
                            </span>
                          </td>
                          <td style={{ padding: 12, textAlign: 'center', fontSize: 14 }}>{org._count.members}</td>
                          <td style={{ padding: 12, fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>
                            {org.paypalSubscriptionId || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Capacity Tab */}
        {activeTab === 'capacity' && capacity && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
              <StatCard
                title="At/Over Capacity"
                value={capacity.atOrOverCapacity}
                color="#ef4444"
                warning={capacity.atOrOverCapacity > 0}
              />
              <StatCard
                title="Near Capacity (80%+)"
                value={capacity.nearCapacity}
                color="#f59e0b"
                warning={capacity.nearCapacity > 0}
              />
            </div>

            {capacity.organizations.atOrOverCapacity.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: '#ef4444' }}>⚠️ Organizations At/Over Capacity</h2>
                </div>
                <div style={{ padding: 20 }}>
                  {capacity.organizations.atOrOverCapacity.map((org: any) => (
                    <div key={org.id} style={{ padding: 12, background: '#fef2f2', borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{org.name}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>
                        {org.seatsUsed} / {org.seatsAllowed} seats ({org._count.members} members)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {capacity.organizations.nearCapacity.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: '#f59e0b' }}>⚡ Near Capacity (80%+)</h2>
                </div>
                <div style={{ padding: 20 }}>

        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                width: 64,
                height: 64,
                margin: '0 auto 20px',
                background: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32
              }}>
                ⚠️
              </div>
              
              <h2 style={{ fontSize: 24, marginBottom: 16, textAlign: 'center', color: '#111827' }}>
                Delete {deleteModal.type === 'user' ? 'User' : 'Organization'}?
              </h2>
              
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24
              }}>
                <p style={{ margin: 0, fontSize: 14, color: '#92400e', fontWeight: 600 }}>
                  ⚠️ Warning: This action cannot be undone!
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, color: '#374151', marginBottom: 12 }}>
                  You are about to delete:
                </p>
                <div style={{
                  background: '#f9fafb',
                  padding: 16,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                    {deleteModal.name}
                  </div>
                  {deleteModal.email && (
                    <div style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace' }}>
                      {deleteModal.email}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                    Type: {deleteModal.type}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
                {deleteModal.type === 'user' 
                  ? 'This will permanently delete the user account and remove them from all organizations. All their data, tasks, and activities will be removed.'
                  : 'This will permanently delete the organization along with all its projects, tasks, members, and data. All members will lose access.'}
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#f3f4f6',
                    color: '#111827',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.5 : 1
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
                  {capacity.organizations.nearCapacity.map((org: any) => (
                    <div key={org.id} style={{ padding: 12, background: '#fef3c7', borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{org.name}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>
                        {org.seatsUsed} / {org.seatsAllowed} seats ({org._count.members} members)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && revenue && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
              <StatCard
                title="Monthly Recurring Revenue"
                value={formatCurrency(revenue.monthlyRecurringRevenue)}
                color="#10b981"
                isLarge
              />
              <StatCard
                title="Potential MRR"
                value={formatCurrency(revenue.potentialMRR)}
                color="#6b7280"
              />
              <StatCard
                title="Active Subscriptions"
                value={revenue.activeSubscriptions}
                color="#4f46e5"
              />
              <StatCard
                title="Avg Seats/Org"
                value={revenue.averageSeatsPerOrg}
                color="#8b5cf6"
              />
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function StatCard({ title, value, color, warning = false, isLarge = false }: any) {
  return (
    <div style={{ 
      background: 'white', 
      padding: 24, 
      borderRadius: 12, 
      border: warning ? `2px solid ${color}` : '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>{title}</div>
      <div style={{ 
        fontSize: isLarge ? 32 : 36, 
        fontWeight: 700, 
        color,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        {warning && <span style={{ fontSize: 24 }}>⚠️</span>}
        {value}
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}
