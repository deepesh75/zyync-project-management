import React from 'react'
import Link from 'next/link'

interface PaymentRestrictionBannerProps {
  organizationId: string
  organizationName: string
  expiredDate: string
  daysOverdue: number
}

export function PaymentRestrictionBanner({
  organizationId,
  organizationName,
  expiredDate,
  daysOverdue
}: PaymentRestrictionBannerProps) {
  const urgency = daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'urgent' : 'warning'

  const bannerStyles: Record<
    string,
    { bg: string; border: string; text: string; heading: string; icon: string }
  > = {
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950',
      border: 'border-l-4 border-amber-500',
      text: 'text-amber-800 dark:text-amber-100',
      heading: 'text-amber-900 dark:text-amber-50',
      icon: '⚠️'
    },
    urgent: {
      bg: 'bg-orange-50 dark:bg-orange-950',
      border: 'border-l-4 border-orange-500',
      text: 'text-orange-800 dark:text-orange-100',
      heading: 'text-orange-900 dark:text-orange-50',
      icon: '⏰'
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-l-4 border-red-500',
      text: 'text-red-800 dark:text-red-100',
      heading: 'text-red-900 dark:text-red-50',
      icon: '🚨'
    }
  }

  const style = bannerStyles[urgency]

  return (
    <div className={`${style.bg} ${style.border} p-4 mb-6 rounded-md`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className={`${style.heading} text-lg font-semibold mb-2 flex items-center gap-2`}>
            <span className="text-xl">{style.icon}</span>
            Subscription Expired - Access Restricted
          </h3>

          <p className={`${style.text} text-sm mb-3`}>
            Your subscription for <strong>{organizationName}</strong> expired on{' '}
            <strong>{expiredDate}</strong> ({daysOverdue} day{daysOverdue !== 1 ? 's' : ''} ago).
          </p>

          <div className={`${style.text} text-sm bg-black/10 dark:bg-white/10 p-3 rounded mb-4 space-y-1`}>
            <p>
              <strong>Current Status:</strong> Access restricted
            </p>
            <p>
              <strong>You can:</strong> View your data and projects
            </p>
            <p>
              <strong>You cannot:</strong> Edit projects, invite members, or create new content
            </p>
          </div>

          <p className={`${style.text} text-sm mb-4`}>
            To restore full access and continue collaborating with your team, please renew your
            subscription immediately.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href={`/organizations/${organizationId}/billing`}
              className={`inline-block px-4 py-2 rounded-md font-medium transition-colors ${
                urgency === 'critical'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : urgency === 'urgent'
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              Renew Subscription
            </Link>

            <Link
              href={`/organizations/${organizationId}`}
              className={`inline-block px-4 py-2 rounded-md font-medium transition-colors ${style.text} border ${
                urgency === 'critical'
                  ? 'border-red-500 hover:bg-red-100 dark:hover:bg-red-900'
                  : urgency === 'urgent'
                  ? 'border-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900'
                  : 'border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900'
              }`}
            >
              View Dashboard Anyway
            </Link>
          </div>
        </div>

        {/* Urgency indicator */}
        <div className="flex-shrink-0 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
              urgency === 'critical'
                ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-200'
                : urgency === 'urgent'
                ? 'bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200'
                : 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200'
            }`}
          >
            {daysOverdue}d
          </div>
          <p className={`${style.text} text-xs mt-2 font-semibold`}>overdue</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Wrapper component to handle access restriction check
 */
export function AccessRestrictedWrapper({
  children,
  organizationId,
  restrictionInfo
}: {
  children: React.ReactNode
  organizationId: string
  restrictionInfo?: {
    isRestricted: boolean
    organizationName?: string
    expiredDate?: string
    daysOverdue?: number
  } | null
}) {
  if (!restrictionInfo?.isRestricted) {
    return <>{children}</>
  }

  return (
    <div>
      <PaymentRestrictionBanner
        organizationId={organizationId}
        organizationName={restrictionInfo.organizationName || 'Your organization'}
        expiredDate={restrictionInfo.expiredDate || 'Unknown date'}
        daysOverdue={restrictionInfo.daysOverdue || 0}
      />
      <div className="opacity-60 pointer-events-none">{children}</div>
    </div>
  )
}
