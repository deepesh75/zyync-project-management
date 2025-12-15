import React from 'react'
import { useFeatureAccess, useCurrentPlan, useIsAdmin, type Feature } from '../lib/permissions'
import Link from 'next/link'

interface FeatureGateProps {
  feature: Feature
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgrade?: boolean
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true
}: FeatureGateProps) {
  const hasAccess = useFeatureAccess(feature)
  const currentPlan = useCurrentPlan()
  const isAdmin = useIsAdmin()

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>
  }

  // User has access to the feature
  if (hasAccess) {
    return <>{children}</>
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>
  }

  // Show upgrade prompt
  if (showUpgrade) {
    return (
      <div className="feature-gate-overlay">
        <div className="feature-gate-content">
          <div className="feature-gate-icon">🔒</div>
          <h3 className="feature-gate-title">Premium Feature</h3>
          <p className="feature-gate-description">
            This feature is available on {getUpgradePlan(feature, currentPlan)} and higher plans.
          </p>
          <Link href="/pricing" className="feature-gate-button">
            Upgrade Now
          </Link>
        </div>
      </div>
    )
  }

  // Hide the feature completely
  return null
}

// Helper function to determine which plan is needed
function getUpgradePlan(feature: Feature, currentPlan: string): string {
  const planHierarchy = ['free', 'pro', 'enterprise']

  for (const plan of planHierarchy) {
    if (plan !== currentPlan) {
      // Check if this plan has the feature
      // This is a simplified check - in reality you'd check PLAN_FEATURES
      if (plan === 'pro' || plan === 'enterprise') {
        return plan.charAt(0).toUpperCase() + plan.slice(1)
      }
    }
  }

  return 'Pro'
}

// Hook for conditional rendering
export function useFeatureGate(feature: Feature) {
  const hasAccess = useFeatureAccess(feature)
  const isAdmin = useIsAdmin()

  return {
    hasAccess: hasAccess || isAdmin,
    showUpgrade: !hasAccess && !isAdmin
  }
}