import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [orgName, setOrgName] = useState('')
  const [creating, setCreating] = useState(false)

  if (status === 'loading') {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  async function createOrganization() {
    if (!orgName.trim()) {
      alert('Please enter an organization name')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        })
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/projects/${data.id}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create organization')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ 
        minHeight: 'calc(100vh - 60px)', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}>
        <div style={{ 
          maxWidth: 600, 
          width: '100%',
          background: 'white',
          borderRadius: 20,
          padding: 50,
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
        }}>
          {step === 1 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>🎉</div>
                <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 10px 0', color: '#111827' }}>
                  Welcome to Zyync!
                </h1>
                <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>
                  Let's get you set up in just a few steps
                </p>
              </div>

              <div style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: 20, background: '#f0f9ff', borderRadius: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0369a1' }}>Create Projects</p>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: 20, background: '#f0fdf4', borderRadius: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#15803d' }}>Invite Team</p>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: 20, background: '#fef3c7', borderRadius: 12 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🚀</div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#b45309' }}>Get Organized</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                style={{
                  width: '100%',
                  padding: 16,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)'
                }}
              >
                Get Started →
              </button>

              <button
                onClick={() => router.push('/')}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: 12,
                  background: 'transparent',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Skip for now
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                style={{
                  marginBottom: 20,
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ← Back
              </button>

              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 20 }}>🏢</div>
                <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 10px 0', color: '#111827' }}>
                  Create Your Organization
                </h2>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  This will be your team's workspace
                </p>
              </div>

              <div style={{ marginBottom: 30 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: '#374151', 
                  marginBottom: 8 
                }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., Acme Inc, My Team"
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '2px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 16,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <button
                onClick={createOrganization}
                disabled={creating || !orgName.trim()}
                style={{
                  width: '100%',
                  padding: 16,
                  background: creating || !orgName.trim() ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: creating || !orgName.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)'
                }}
              >
                {creating ? 'Creating...' : 'Create Organization →'}
              </button>

              <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 20 }}>
                Don't worry, you can always change this later
              </p>
            </>
          )}
        </div>
      </main>
    </>
  )
}
