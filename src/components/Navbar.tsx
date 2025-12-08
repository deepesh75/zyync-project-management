import React, { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useTheme } from '../contexts/ThemeContext'
import { useNotifications } from '../hooks/useNotifications'

export default function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Use SWR hook for notifications with auto-polling
  const { notifications, unreadCount, mutate } = useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id: string) => {
    // Optimistic update
    const optimisticNotifications = notifications.map((n: any) => 
      n.id === id ? { ...n, read: true } : n
    )
    mutate(optimisticNotifications, false)
    
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      mutate()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      mutate()
    }
  }

  const markAllAsRead = async () => {
    // Optimistic update
    const optimisticNotifications = notifications.map((n: any) => ({ ...n, read: true }))
    mutate(optimisticNotifications, false)
    
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      mutate()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      mutate()
    }
  }

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id)
    if (notification.link) {
      router.push(notification.link)
    }
    setShowNotifications(false)
  }

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      padding: '18px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(12px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <a href="/" style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          color: 'white', 
          textDecoration: 'none', 
          letterSpacing: '-0.02em',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          Zyync
        </a>
        {session && (
          <div style={{ display: 'flex', gap: 28 }}>
            <a href="/" style={{ 
              color: 'white', 
              textDecoration: 'none', 
              fontSize: 15, 
              fontWeight: 600, 
              opacity: 0.95, 
              transition: 'all 0.2s',
              padding: '6px 0',
              borderBottom: '2px solid transparent'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.borderBottomColor = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.95'
                e.currentTarget.style.borderBottomColor = 'transparent'
              }}>
              Projects
            </a>
          </div>
        )}
      </div>
      
      {session && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ 
            fontSize: 14, 
            color: 'white', 
            opacity: 0.9, 
            fontWeight: 500,
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '8px 16px',
            borderRadius: 10,
            backdropFilter: 'blur(8px)'
          }}>{session.user?.email}</span>
          
          {/* Notifications Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.25)',
                color: 'white',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 18,
                backdropFilter: 'blur(12px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                lineHeight: 1,
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'
                e.currentTarget.style.transform = 'scale(1.08)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              title="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  border: '2.5px solid rgba(255, 255, 255, 1)',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width: 400,
                maxHeight: 500,
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                borderRadius: 16,
                boxShadow: 'var(--shadow-2xl)',
                overflow: 'hidden',
                zIndex: 1000,
                animation: 'slideUp 0.3s ease'
              }}>
                {/* Header */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '2px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)'
                }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                    🔔 Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      style={{
                        background: 'var(--primary-light)',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: 8,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--primary)'
                        e.currentTarget.style.color = 'white'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--primary-light)'
                        e.currentTarget.style.color = 'var(--primary)'
                      }}
                    >
                      ✓ Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: 14
                    }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🔕</div>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: notif.link ? 'pointer' : 'default',
                          background: notif.read ? 'transparent' : 'var(--bg-secondary)',
                          transition: 'background 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = notif.read ? 'transparent' : 'var(--bg-secondary)'}
                      >
                        {!notif.read && (
                          <div style={{
                            position: 'absolute',
                            left: 6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#3b82f6'
                          }} />
                        )}
                        <div style={{ marginLeft: notif.read ? 0 : 12 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>
                            {notif.message}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>
                            {new Date(notif.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={toggleTheme}
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.25)',
              color: 'white',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 10,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              lineHeight: 1,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'
              e.currentTarget.style.transform = 'scale(1.08) rotate(15deg)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.25)',
              color: 'white',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
