import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    const res = await fetch('/api/auth/signup', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email, password, name, organizationName }) 
    })
    
    const data = await res.json()
    
    if (res.ok) {
      setSuccess(true)
      // Don't redirect automatically - show success message
    } else {
      setError(data.error || 'Signup failed')
    }
  }

  if (success) {
    return (
      <>
        <Navbar />
        <main style={{ padding: 24, maxWidth: 500, margin: '60px auto' }}>
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 12,
            padding: 32,
            textAlign: 'center'
          }}>
            <div style={{
              width: 64,
              height: 64,
              margin: '0 auto 20px',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              color: 'white'
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: 24, marginBottom: 16, color: '#111827' }}>Check your email!</h1>
            <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 24 }}>
              We've sent a verification link to <strong>{email}</strong>
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>
              Click the link in the email to verify your account and complete the signup process.
            </p>
            <button
              onClick={async () => {
                setError(null)
                const res = await fetch('/api/auth/resend-verification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                })
                if (res.ok) {
                  alert('Verification email resent! Check your inbox.')
                } else {
                  const data = await res.json()
                  setError(data.error || 'Failed to resend email')
                }
              }}
              style={{
                padding: '10px 24px',
                background: '#f3f4f6',
                color: '#111827',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              Resend verification email
            </button>
            {error && <div style={{ color: '#ef4444', fontSize: 14, marginTop: 16 }}>{error}</div>}
          </div>
          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
            Already verified? <a href="/auth/signin" style={{ color: '#6366f1', fontWeight: 600 }}>Sign in</a>
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: 24, maxWidth: 400, margin: '60px auto' }}>
        <h1 style={{ marginBottom: 24 }}>Sign Up</h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input 
            placeholder="Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <input 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <input 
            placeholder="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <input 
            placeholder="Organization / Company Name" 
            value={organizationName} 
            onChange={(e) => setOrganizationName(e.target.value)} 
            required
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
            Create your workspace where you and your team can collaborate on projects.
          </p>
          <button 
            type="submit" 
            style={{ padding: 10, background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            Create account & workspace
          </button>
          {error && <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>}
        </form>
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14 }}>
          Have an account? <a href="/auth/signin" style={{ color: '#6366f1' }}>Sign in</a>
        </p>
      </main>
    </>
  )
}
