import React, { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '../contexts/ThemeContext'
import { useNotifications } from '../hooks/useNotifications'
import { useOrganization as useCurrentUserOrganization } from '../lib/permissions'

function getNavbarStyleForBackground(bg?: string, theme?: string): { background: string; textColor: string; opacity: string } {
  if (!bg) {
    // Default theme-aware navbar
    if (theme === 'dark') {
      return { 
        background: 'var(--bg-secondary)', 
        textColor: 'var(--text)',
        opacity: '0.95'
      }
    } else {
      return { 
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
        textColor: 'white',
        opacity: '0.95'
      }
    }
  }
  
  const darkBackgrounds = ['solid-dark', 'gradient-night', 'gradient-forest', 'gradient-terminal', 'gradient-steel', 'gradient-twilight', 'gradient-royal', 'gradient-velvet', 'gradient-ice']
  const lightBackgrounds = ['solid-light', 'solid-white', 'solid-cream', 'gradient-peach', 'gradient-aurora', 'gradient-mystic', 'gradient-crystal', 'solid-gray']
  
  if (darkBackgrounds.includes(bg)) {
    return { 
      background: 'rgba(0, 0, 0, 0.4)', 
      textColor: '#ffffff',
      opacity: '1'
    }
  }
  if (lightBackgrounds.includes(bg)) {
    // For light backgrounds, use a nice gradient navbar in light mode, dark navbar in dark mode
    if (theme === 'dark') {
      return { 
        background: 'rgba(0, 0, 0, 0.6)', 
        textColor: '#ffffff',
        opacity: '1'
      }
    } else {
      return { 
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
        textColor: 'white',
        opacity: '0.95'
      }
    }
  }
  // For colorful gradients, use semi-transparent dark background with white text
  return { 
    background: 'rgba(0, 0, 0, 0.3)', 
    textColor: '#ffffff',
    opacity: '0.95'
  }
}

interface NavbarProps {
  background?: string
}

export default function Navbar({ background }: NavbarProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Use SWR hook for notifications with auto-polling - only when authenticated
  const { notifications, unreadCount, mutate } = useNotifications(!!session)
  
  // Get user's organization for plan display
  const { organization } = useCurrentUserOrganization()
  
  // Get plan display info
  const getPlanDisplay = (planId: string | null) => {
    if (!planId || planId === 'free') {
      return { name: 'Free', color: 'rgba(255, 255, 255, 0.7)', bgColor: 'rgba(255, 255, 255, 0.15)' }
    } else if (planId.includes('pro') || planId.includes('P-')) {
      return { name: 'Pro', color: 'white', bgColor: 'rgba(59, 130, 246, 0.35)' }
    } else if (planId === 'enterprise') {
      return { name: 'Enterprise', color: 'white', bgColor: 'rgba(147, 51, 234, 0.35)' }
    } else {
      return { name: 'Free', color: 'rgba(255, 255, 255, 0.7)', bgColor: 'rgba(255, 255, 255, 0.15)' }
    }
  }
  
  const planDisplay = organization ? getPlanDisplay(organization.planId) : null

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
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
    <>
    <style jsx>{`
      .navbar {
        max-width: 100vw;
        box-sizing: border-box;
        overflow: visible;
      }
      @media (max-width: 768px) {
        .navbar {
          padding: 12px 16px !important;
        }
        .nav-links {
          display: none !important;
        }
        .mobile-menu-btn {
          display: flex !important;
        }
        .desktop-user-info {
          display: none !important;
        }
        .mobile-user-info {
          display: flex !important;
        }
      }
      @media (min-width: 769px) {
        .mobile-menu-btn {
          display: none !important;
        }
        .mobile-user-info {
          display: none !important;
        }
      }
    `}</style>
    <nav className="navbar" style={{
      background: getNavbarStyleForBackground(background, theme).background,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      padding: '18px 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      backdropFilter: 'blur(12px)',
      width: '100%',
      maxWidth: '100vw',
      boxSizing: 'border-box',
      borderBottom: theme === 'dark' && !background ? '1px solid var(--border)' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link href="/" style={{ 
            fontSize: 24, 
            fontWeight: 800, 
            color: getNavbarStyleForBackground(background, theme).textColor, 
            textDecoration: 'none', 
            letterSpacing: '-0.02em',
            textShadow: theme === 'dark' && !background ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.1)',
            lineHeight: 1
          }}>
            Zyync
          </Link>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: getNavbarStyleForBackground(background, theme).textColor,
            opacity: 0.7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: -2
          }}>
            Beta
          </span>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {session && (
            <>
              <Link href="/" prefetch={true} style={{ 
                color: getNavbarStyleForBackground(background, theme).textColor, 
                textDecoration: 'none', 
                fontSize: 15, 
                fontWeight: 600, 
                opacity: getNavbarStyleForBackground(background, theme).opacity, 
                transition: 'all 0.2s',
                padding: '6px 0',
                borderBottom: '2px solid transparent'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.borderBottomColor = getNavbarStyleForBackground(background, theme).textColor
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = getNavbarStyleForBackground(background, theme).opacity
                  e.currentTarget.style.borderBottomColor = 'transparent'
                }}>
                Projects
              </Link>
            </>
          )}
          <Link href="/pricing" prefetch={true} style={{ 
            color: getNavbarStyleForBackground(background, theme).textColor, 
            textDecoration: 'none', 
            fontSize: 15, 
            fontWeight: 600, 
            opacity: getNavbarStyleForBackground(background, theme).opacity, 
            transition: 'all 0.2s',
            padding: '6px 0',
            borderBottom: '2px solid transparent'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.borderBottomColor = getNavbarStyleForBackground(background, theme).textColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = getNavbarStyleForBackground(background, theme).opacity
              e.currentTarget.style.borderBottomColor = 'transparent'
            }}>
            Pricing
          </Link>
        </div>
      </div>
      
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          background: theme === 'dark' && !background ? 'var(--bg-primary)' : (background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)'),
          border: theme === 'dark' && !background ? '1px solid var(--border)' : 'none',
          borderRadius: 8,
          padding: '8px 12px',
          cursor: 'pointer',
          color: getNavbarStyleForBackground(background, theme).textColor
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      {session && (
        <div className="desktop-user-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          
          {/* Plan Badge */}
          {planDisplay && (
            <span style={{
              fontSize: 13,
              color: getNavbarStyleForBackground(background, theme).textColor,
              fontWeight: 600,
              background: theme === 'dark' && !background ? 'var(--bg-primary)' : (background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'),
              padding: '10px 14px',
              borderRadius: 10,
              backdropFilter: 'blur(12px)',
              border: theme === 'dark' && !background ? '1px solid var(--border)' : `1.5px solid ${background ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.4)'}`,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              lineHeight: 1
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}>
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
              {planDisplay.name}
            </span>
          )}
          
          {/* Notifications Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                width: 42, height: 42,
                padding: 0,
                background: theme === 'dark' && !background ? 'var(--bg-primary)' : (background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'),
                color: getNavbarStyleForBackground(background, theme).textColor,
                border: theme === 'dark' && !background ? '1px solid var(--border)' : `1.5px solid ${background ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.4)'}`,
                borderRadius: 10,
                cursor: 'pointer',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = background ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.35)'
                e.currentTarget.style.transform = 'scale(1.08)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'
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
                    notifications.map((notif: any) => (
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
          
          {/* Theme toggle */}
          <button 
            onClick={toggleTheme}
            style={{
              width: 42, height: 42,
              padding: 0,
              background: theme === 'dark' && !background ? 'var(--bg-primary)' : (background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'),
              color: getNavbarStyleForBackground(background, theme).textColor,
              border: theme === 'dark' && !background ? '1px solid var(--border)' : `1.5px solid ${background ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.4)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme === 'dark' && !background ? 'var(--hover-bg)' : (background ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.35)')
              e.currentTarget.style.transform = 'scale(1.08) rotate(15deg)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme === 'dark' && !background ? 'var(--bg-primary)' : (background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)')
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

          {/* Avatar + dropdown (replaces email text + sign out button) */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            {(() => {
              const nameOrEmail = session.user?.name || session.user?.email || '?'
              const initials = nameOrEmail
                .split(/[\s@]/)
                .filter(Boolean)
                .slice(0, 2)
                .map((s: string) => s[0].toUpperCase())
                .join('')
              return (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title={session.user?.email || ''}
                  style={{
                    width: 42, height: 42,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    border: '1.5px solid rgba(99,102,241,0.5)',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.08)'
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.35)'
                  }}
                >
                  {initials}
                </button>
              )
            })()}

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                minWidth: 220,
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                zIndex: 1000
              }}>
                {/* User info header */}
                <div style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-secondary)'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                    {session.user?.name || 'Account'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.user?.email}
                  </div>
                </div>
                {/* Sign out */}
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    color: 'var(--text)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile User Info - Compact */}
      {session && (
        <div className="mobile-user-info" style={{ display: 'none', alignItems: 'center', gap: 12 }}>
          {/* Notifications Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.25)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'white',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {!session && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/auth/signin" style={{
            color: getNavbarStyleForBackground(background, theme).textColor,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
            opacity: getNavbarStyleForBackground(background, theme).opacity,
            transition: 'all 0.3s',
            padding: '8px 0'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = getNavbarStyleForBackground(background, theme).opacity
            }}>
            Sign in
          </Link>
          <Link href="/auth/signup" style={{
            padding: '10px 20px',
            background: theme === 'dark' && !background ? 'var(--primary)' : (background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'),
            color: theme === 'dark' && !background ? 'white' : getNavbarStyleForBackground(background, theme).textColor,
            border: theme === 'dark' && !background ? 'none' : `1.5px solid ${background ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.4)'}`,
            borderRadius: 10,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'inline-block'
          }}
            onMouseEnter={(e) => {
              if (theme === 'dark' && !background) {
                e.currentTarget.style.background = 'var(--primary-hover)'
              } else {
                e.currentTarget.style.background = background ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.35)'
              }
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              if (theme === 'dark' && !background) {
                e.currentTarget.style.background = 'var(--primary)'
              } else {
                e.currentTarget.style.background = background ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)'
              }
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
            Sign up
          </Link>
        </div>
      )}
    </nav>

    {/* Mobile Menu Dropdown */}
    {session && mobileMenuOpen && (
      <div style={{
        position: 'fixed',
        top: 60,
        left: 0,
        right: 0,
        background: 'white',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 99,
        padding: '20px',
        animation: 'slideDown 0.3s ease'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Link 
            href="/" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ 
              color: '#111827', 
              textDecoration: 'none', 
              fontSize: 16, 
              fontWeight: 600,
              padding: '12px 16px',
              borderRadius: 8,
              background: '#f3f4f6',
              display: 'block'
            }}>
            📊 Projects
          </Link>
          <Link 
            href="/pricing" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ 
              color: '#111827', 
              textDecoration: 'none', 
              fontSize: 16, 
              fontWeight: 600,
              padding: '12px 16px',
              borderRadius: 8,
              background: '#f3f4f6',
              display: 'block'
            }}>
            💰 Pricing
          </Link>
          <div style={{
            padding: '12px 16px',
            background: '#f9fafb',
            borderRadius: 8,
            fontSize: 14,
            color: '#6b7280'
          }}>
            {session.user?.email}
          </div>
          {planDisplay && (
            <div style={{
              padding: '10px 16px',
              background: planDisplay.bgColor,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: planDisplay.color,
              textAlign: 'center'
            }}>
              {planDisplay.name} Plan
            </div>
          )}
          <button 
            onClick={() => {
              toggleTheme()
              setMobileMenuOpen(false)
            }}
            style={{
              padding: '12px 16px',
              background: '#f3f4f6',
              color: '#111827',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
            {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
          <button 
            onClick={() => {
              signOut({ callbackUrl: '/' })
              setMobileMenuOpen(false)
            }}
            style={{
              padding: '12px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center'
            }}>
            🚪 Sign out
          </button>
        </div>
      </div>
    )}
    </>
  )
}
