import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'

export default function VerifyEmail() {
  const router = useRouter()
  const { token } = router.query
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token && typeof token === 'string') {
      verifyEmail(token)
    }
  }, [token])

  async function verifyEmail(verificationToken: string) {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken })
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'Email verified successfully!')
        // Redirect to signin after 3 seconds
        setTimeout(() => {
          router.push('/auth/signin')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Verification failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred during verification')
    }
  }

  return (
    <>
      <Navbar />
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 48,
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {status === 'verifying' && (
            <>
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                borderRadius: '50%',
                border: '4px solid #f3f4f6',
                borderTopColor: '#4f46e5',
                animation: 'spin 1s linear infinite'
              }}></div>
              <h1 style={{ fontSize: 24, marginBottom: 12, color: '#111827' }}>
                Verifying your email...
              </h1>
              <p style={{ color: '#6b7280', fontSize: 16 }}>
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                background: '#10b981',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48
              }}>
                ✓
              </div>
              <h1 style={{ fontSize: 24, marginBottom: 12, color: '#111827' }}>
                Email Verified!
              </h1>
              <p style={{ color: '#6b7280', fontSize: 16, marginBottom: 24 }}>
                {message}
              </p>
              <p style={{ color: '#9ca3af', fontSize: 14 }}>
                Redirecting to sign in...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                background: '#ef4444',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                color: 'white'
              }}>
                ✕
              </div>
              <h1 style={{ fontSize: 24, marginBottom: 12, color: '#111827' }}>
                Verification Failed
              </h1>
              <p style={{ color: '#6b7280', fontSize: 16, marginBottom: 32 }}>
                {message}
              </p>
              <button
                onClick={() => router.push('/auth/signin')}
                style={{
                  padding: '12px 32px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Go to Sign In
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
