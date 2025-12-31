import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Navbar from '../../components/Navbar'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setShowResendVerification(false)
    
    const res = await signIn('credentials', { redirect: false, email, password })
    
    if (res?.error) {
      setError(res.error)
      // Check if error is about email verification
      if (res.error.includes('verify your email')) {
        setShowResendVerification(true)
      }
    } else {
      router.push('/')
    }
  }

  async function resendVerification() {
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert('Verification email sent! Please check your inbox.')
      } else {
        alert(data.error || 'Failed to send verification email')
      }
    } catch (error) {
      alert('An error occurred. Please try again.')
    }
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
          {error && (
            <div>
              <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>
              {showResendVerification && (
                <button
                  type="button"
                  onClick={resendVerification}
                  style={{
                    marginTop: 12,
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    color: '#111827',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    width: '100%'
                  }}
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}
        </form>
        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14 }}>
          No account? <a href="/auth/signup" style={{ color: '#6366f1' }}>Sign up</a>
        </p>
      </main>
    </>
  )
}
