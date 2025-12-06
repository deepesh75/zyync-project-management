import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    const res = await fetch('/api/auth/signup', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email, password, name, organizationName }) 
    })
    
    if (res.ok) {
      router.push('/auth/signin?message=Account created! Please sign in.')
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error || 'Signup failed')
    }
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
