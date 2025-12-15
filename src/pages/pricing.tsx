import React from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individuals and small teams getting started',
    features: [
      'Up to 3 projects',
      'Unlimited tasks',
      'Kanban board view',
      'Basic task management',
      'Comments on tasks',
      '5 team members',
      'Community support'
    ],
    cta: 'Get Started',
    highlight: false,
    priceId: null, // No payment needed
    id: 'free'
  },
  {
    name: 'Pro',
    price: 'Starting at $3',
    period: '/user/month',
    description: 'For growing teams that need more',
    features: [
      'Unlimited projects',
      'Unlimited tasks',
      'Kanban, Table & Calendar views',
      'Advanced task management',
      'File attachments',
      'Unlimited team members',
      'Priority email support',
      'Workflow automation',
      'Activity logs',
      'Task templates'
    ],
    pricing: {
      monthly: '$4/user/month (billed monthly)',
      annual: '$3/user/month (billed annually - save 25%)',
      minUsers: 1
    },
    cta: 'Start Free Trial',
    highlight: true,
    priceId: 'paypal_pro_plan', // Will be replaced with actual PayPal plan ID
    id: 'pro'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Advanced features',
      'Custom integrations',
      'Priority support',
      'Dedicated account manager'
    ],
    cta: 'Contact Sales',
    highlight: false,
    priceId: null,
    id: 'enterprise'
  },
  {
    name: 'Pro Lifetime',
    price: '$99',
    period: 'one-time',
    description: 'One-time payment for Pro features',
    features: [
      'All Pro features',
      'No monthly payments',
      'Lifetime access'
    ],
    cta: 'Get Lifetime Access',
    highlight: false,
    priceId: 'paypal_pro_lifetime', // Will be replaced with actual PayPal plan ID
    id: 'pro_lifetime'
  }
]

export default function Pricing() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleSelectPlan = (plan: any) => {
    if (!session) {
      // Redirect to signup with plan info
      router.push(`/auth/signup?plan=${plan.id}`)
      return
    }

    // Handle different plan types
    switch (plan.id) {
      case 'free':
        // Redirect to home to start using free plan
        router.push('/')
        break
      case 'pro':
        // Redirect to Pro plan selection with user count
        router.push('/pricing/pro')
        break
      case 'enterprise':
        // Open contact form or redirect to contact page
        window.open('mailto:sales@zyync.com?subject=Enterprise%20Inquiry', '_blank')
        break
      case 'pro_lifetime':
        // Redirect to lifetime deal checkout
        router.push('/pricing/lifetime')
        break
      default:
        router.push('/')
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ fontFamily: 'inherit', minHeight: 'calc(100vh - 60px)' }}>
        {/* Hero Section */}
        <section style={{ 
          padding: '80px 24px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: 0, marginBottom: 16 }}>Simple, Transparent Pricing</h1>
          <p style={{ fontSize: 20, margin: 0, opacity: 0.9 }}>Choose the plan that fits your team's needs</p>
        </section>

        {/* Pricing Cards */}
        <section style={{ 
          padding: '80px 24px', 
          maxWidth: 1200, 
          margin: '0 auto'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 32,
            alignItems: 'start'
          }}>
            {plans.map((plan) => (
              <div
                key={plan.name}
                style={{
                  background: 'white',
                  border: plan.highlight ? '3px solid #6366f1' : '1px solid #e5e7eb',
                  borderRadius: 16,
                  padding: 40,
                  boxShadow: plan.highlight ? '0 20px 40px rgba(99, 102, 241, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                  position: 'relative',
                  transform: plan.highlight ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!plan.highlight) {
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!plan.highlight) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                {plan.highlight && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#6366f1',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Most Popular
                  </div>
                )}

                <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, marginBottom: 8, color: '#111827' }}>
                  {plan.name}
                </h2>
                <p style={{ color: '#6b7280', margin: 0, marginBottom: 24, fontSize: 14 }}>
                  {plan.description}
                </p>

                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#111827', margin: 0 }}>
                    {plan.price}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
                    {plan.period}
                  </div>
                  {plan.pricing && (
                    <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Pricing Options:</div>
                      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                        <div>• {plan.pricing.monthly}</div>
                        <div>• {plan.pricing.annual}</div>
                        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                          Minimum {plan.pricing.minUsers} user{plan.pricing.minUsers > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    background: plan.highlight ? '#6366f1' : '#f3f4f6',
                    color: plan.highlight ? 'white' : '#1f2937',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: 32
                  }}
                  onMouseEnter={(e) => {
                    if (plan.highlight) {
                      e.currentTarget.style.background = '#4f46e5'
                    } else {
                      e.currentTarget.style.background = '#e5e7eb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.highlight) {
                      e.currentTarget.style.background = '#6366f1'
                    } else {
                      e.currentTarget.style.background = '#f3f4f6'
                    }
                  }}
                >
                  {plan.cta}
                </button>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      style={{
                        padding: '12px 0',
                        borderBottom: idx < plan.features.length - 1 ? '1px solid #f3f4f6' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 14,
                        color: '#374151'
                      }}
                    >
                      <span style={{
                        color: '#10b981',
                        fontSize: 18,
                        lineHeight: 1
                      }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section style={{
          padding: '80px 24px',
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 40, color: '#111827' }}>
              Frequently Asked Questions
            </h2>

            {[
              {
                q: 'Can I change plans later?',
                a: 'Yes! You can upgrade, downgrade, or cancel your plan at any time from your billing settings.'
              },
              {
                q: 'Do you offer a free trial?',
                a: 'Yes, Pro and Enterprise plans come with a 14-day free trial. No credit card required.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards via Stripe. We also support invoicing for Enterprise customers.'
              },
              {
                q: 'Is there a setup fee?',
                a: 'No setup fees. You only pay for the plan you choose, starting from day one.'
              },
              {
                q: 'What happens when I reach team member limits?',
                a: 'You\'ll be notified when approaching your limit. You can upgrade anytime to add more members.'
              }
            ].map((faq, idx) => (
              <div key={idx} style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 8, color: '#111827' }}>
                  {faq.q}
                </h3>
                <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: '80px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, margin: 0, marginBottom: 16 }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: 18, margin: 0, marginBottom: 32, opacity: 0.9 }}>
            Join thousands of teams using Zyync to manage their projects
          </p>
          <button
            onClick={() => signIn()}
            style={{
              padding: '14px 32px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Start Your Free Trial
          </button>
        </section>
      </main>
    </>
  )
}
