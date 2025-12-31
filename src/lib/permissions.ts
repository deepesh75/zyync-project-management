import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

// Define plan types
export type PlanType = 'free' | 'pro' | 'enterprise'

// Define features that can be restricted
export type Feature =
  | 'unlimited_projects'
  | 'unlimited_tasks'
  | 'advanced_filters'
  | 'workflows'
  | 'templates'
  | 'calendar_view'
  | 'timeline_view'
  | 'table_view'
  | 'team_collaboration'
  | 'priority_support'
  | 'api_access'
  | 'custom_integrations'

// Admin email that gets access to all features
const ADMIN_EMAIL = 'deepesh1234.dc@gmail.com'

// Plan feature matrix
const PLAN_FEATURES: Record<PlanType, Feature[]> = {
  free: [
    'unlimited_projects', // Allow unlimited projects on free plan
    'unlimited_tasks', // Basic features for free users
    'calendar_view',
    'table_view'
  ],
  pro: [
    'unlimited_projects',
    'unlimited_tasks',
    'advanced_filters',
    'workflows',
    'templates',
    'calendar_view',
    'timeline_view',
    'table_view',
    'team_collaboration'
  ],
  enterprise: [
    'unlimited_projects',
    'unlimited_tasks',
    'advanced_filters',
    'workflows',
    'templates',
    'calendar_view',
    'timeline_view',
    'table_view',
    'team_collaboration',
    'priority_support',
    'api_access',
    'custom_integrations'
  ]
}

// Get user's current plan
export function getUserPlan(userEmail?: string | null, organizationPlanId?: string | null): PlanType {
  // Admin gets enterprise access
  if (userEmail === ADMIN_EMAIL) {
    return 'enterprise'
  }

  // Check organization's plan
  if (organizationPlanId) {
    if (organizationPlanId === 'free') return 'free'
    if (organizationPlanId.includes('pro') || organizationPlanId.includes('P-')) return 'pro'
    if (organizationPlanId === 'enterprise') return 'enterprise'
  }

  // Default to free
  return 'free'
}

// Check if user has access to a feature
export function hasFeatureAccess(feature: Feature, userEmail?: string | null, organizationPlanId?: string | null): boolean {
  const plan = getUserPlan(userEmail, organizationPlanId)
  return PLAN_FEATURES[plan].includes(feature)
}

// Hook to check feature access
// Hook to check feature access
export function useFeatureAccess(feature: Feature) {
  const { data: session } = useSession()
  const [hasAccess, setHasAccess] = useState(false)
  const [organizationPlanId, setOrganizationPlanId] = useState<string | null>(null)

  useEffect(() => {
    // Fetch user's organization to get planId
    const fetchOrganization = async () => {
      if (!session?.user?.email) return

      try {
        const response = await fetch('/api/organizations')
        if (response.ok) {
          const organizations = await response.json()
          if (organizations && organizations.length > 0) {
            setOrganizationPlanId(organizations[0].planId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error)
      }
    }

    fetchOrganization()
  }, [session?.user?.email])

  useEffect(() => {
    const access = hasFeatureAccess(feature, session?.user?.email, organizationPlanId)
    setHasAccess(access)
  }, [feature, session?.user?.email, organizationPlanId])

  return hasAccess
}

// Hook to get current plan
export function useCurrentPlan() {
  const { data: session } = useSession()
  const [plan, setPlan] = useState<PlanType>('free')
  const [organizationPlanId, setOrganizationPlanId] = useState<string | null>(null)

  useEffect(() => {
    // Fetch user's organization to get planId
    const fetchOrganization = async () => {
      if (!session?.user?.email) return

      try {
        const response = await fetch('/api/organizations')
        if (response.ok) {
          const organizations = await response.json()
          if (organizations && organizations.length > 0) {
            setOrganizationPlanId(organizations[0].planId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error)
      }
    }

    fetchOrganization()
  }, [session?.user?.email])

  useEffect(() => {
    const userPlan = getUserPlan(session?.user?.email, organizationPlanId)
    setPlan(userPlan)
  }, [session?.user?.email, organizationPlanId])

  return plan
}

// Check if user is admin
export function isAdmin(userEmail?: string | null): boolean {
  return userEmail === ADMIN_EMAIL
}

// Hook to check admin status
export function useIsAdmin() {
  const { data: session } = useSession()
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    setAdmin(isAdmin(session?.user?.email))
  }, [session?.user?.email])

  return admin
}

// Hook to get organization details
export function useOrganization() {
  const { data: session } = useSession()
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!session?.user?.email) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/organizations')
        if (response.ok) {
          const organizations = await response.json()
          if (organizations && organizations.length > 0) {
            setOrganization(organizations[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [session?.user?.email])

  return { organization, loading }
}