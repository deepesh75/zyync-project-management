import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await signIn('credentials', { redirect: false, email, password })
    if (res?.error) setError(res.error)
    else router.push('/')
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: 24, maxWidth: 400, margin: '60px auto' }}>
        <h1 style={{ marginBottom: 24 }}>Sign In</h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <input 
            placeholder="Password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
          <button 
            type="submit" 
            style={{ padding: 10, background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            Sign in
          </button>
          {error && <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>}
        </form>
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14 }}>
          No account? <a href="/auth/signup" style={{ color: '#6366f1' }}>Sign up</a>
        </p>
      </main>
    </>
  )
}
