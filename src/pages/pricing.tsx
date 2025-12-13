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
    description: 'Perfect for getting started',
    features: [
      'Up to 3 projects',
      'Unlimited tasks',
      'Basic task management',
      'Comments & mentions',
      '1 team member',
      'Community support'
    ],
    cta: 'Get Started',
    highlight: false,
    priceId: null // No Stripe price ID for free plan
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For growing teams',
    features: [
      'Unlimited projects',
      'Unlimited tasks',
      'Advanced task management',
      'Comments & mentions',
      'Up to 10 team members',
      'Email support',
      'Activity log',
      'Task duplication',
      'Card customization'
    ],
    cta: 'Start Free Trial',
    highlight: true,
    priceId: 'price_pro_monthly' // Replace with actual Stripe price ID
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Advanced permissions',
      'SSO (Google, GitHub)',
      'Custom integrations',
      'Priority support',
      'SLA guaranteed',
      'Dedicated account manager'
    ],
    cta: 'Contact Sales',
    highlight: false,
    priceId: null
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

    // If already signed in, redirect to home to select an organization
    router.push('/')
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
