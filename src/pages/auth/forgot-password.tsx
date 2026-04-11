import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage(data.message)
        setEmail('')
      } else {
        setError(data.error || 'Failed to send reset email')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Forgot Password - Zyync</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '48px 40px',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              Forgot Password?
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {message && (
            <div style={{
              background: '#d1fae5',
              border: '1px solid #6ee7b7',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px'
            }}>
              <p style={{
                color: '#065f46',
                fontSize: '14px',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {message}
              </p>
            </div>
          )}

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid '#fca5a5',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px'
            }}>
              <p style={{
                color: '#991b1b',
                fontSize: '14px',
                margin: 0,
                lineHeight: '1.5'
              }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                background: isLoading ? 'var(--border)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, opacity 0.2s',
                boxShadow: isLoading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '14px',
              margin: '0 0 8px'
            }}>
              Remember your password?
            </p>
            <Link 
              href="/auth/signin"
              style={{
                color: '#667eea',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
