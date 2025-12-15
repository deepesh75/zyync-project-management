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
export function getUserPlan(userEmail?: string | null): PlanType {
  // Admin gets enterprise access
  if (userEmail === ADMIN_EMAIL) {
    return 'enterprise'
  }

  // For now, default to free until we implement subscription checking
  // TODO: Check database for actual subscription status
  return 'free'
}

// Check if user has access to a feature
export function hasFeatureAccess(feature: Feature, userEmail?: string | null): boolean {
  const plan = getUserPlan(userEmail)
  return PLAN_FEATURES[plan].includes(feature)
}

// Hook to check feature access
export function useFeatureAccess(feature: Feature) {
  const { data: session } = useSession()
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const access = hasFeatureAccess(feature, session?.user?.email)
    setHasAccess(access)
  }, [feature, session?.user?.email])

  return hasAccess
}

// Hook to get current plan
export function useCurrentPlan() {
  const { data: session } = useSession()
  const [plan, setPlan] = useState<PlanType>('free')

  useEffect(() => {
    const userPlan = getUserPlan(session?.user?.email)
    setPlan(userPlan)
  }, [session?.user?.email])

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