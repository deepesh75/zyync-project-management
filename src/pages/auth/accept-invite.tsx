import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import Navbar from '../../components/Navbar'

export default function AcceptInvite() {
  const router = useRouter()
  const { token } = router.query
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    
    fetch(`/api/invitations/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setInvitation(data)
        }
      })
      .catch(() => setError('Failed to load invitation'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!invitation || !password) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invitation.email,
          password,
          name,
          invitationToken: token
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to accept invitation')
        setSubmitting(false)
        return
      }

      // Sign in automatically
      const result = await signIn('credentials', {
        email: invitation.email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Account created but failed to sign in. Please sign in manually.')
        setTimeout(() => router.push('/auth/signin'), 2000)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('Something went wrong')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 24, maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <p>Loading invitation...</p>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div style={{ padding: 24, maxWidth: 500, margin: '0 auto' }}>
          <h1>Invalid Invitation</h1>
          <p style={{ color: '#ef4444' }}>{error}</p>
          <a href="/auth/signin" style={{ color: '#6366f1' }}>Go to Sign In</a>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div style={{ padding: 24, maxWidth: 500, margin: '0 auto' }}>
        <h1>Accept Invitation</h1>
        <p>You've been invited to join <strong>{invitation?.organizationName}</strong> as a {invitation?.role}.</p>
        <p>Create your account to accept the invitation.</p>

        <form onSubmit={handleAccept} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Email</label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', background: '#f3f4f6' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
            />
          </div>

          {error && (
            <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            style={{
              padding: 12,
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting ? 'Creating account...' : 'Accept & Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 14, color: '#6b7280' }}>
          Already have an account? <a href="/auth/signin" style={{ color: '#6366f1' }}>Sign in</a>
        </p>
      </div>
    </>
  )
}
