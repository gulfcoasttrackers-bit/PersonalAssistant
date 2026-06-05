'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Props {
  isConnected: boolean
}

const STEPS = [
  {
    number: 1,
    title: 'Connect your Google Account',
    description: 'Sign in with Google to authorize access to your Google Calendar. This is a one-time step — your credentials are stored securely.',
    completedLabel: 'Google account linked',
  },
  {
    number: 2,
    title: 'Sync your calendar',
    description: 'Pull events from your primary Google Calendar into the app. Syncs 90 days back and 180 days forward. Safe to run anytime — events are de-duplicated.',
    completedLabel: 'Calendar synced successfully',
  },
  {
    number: 3,
    title: "You're all set",
    description: 'Your Google Calendar events now appear alongside your tasks and manually created events. Sync again anytime to pull the latest changes.',
    completedLabel: 'Setup complete',
  },
]

export function GoogleCalendarSetup({ isConnected: initialConnected }: Props) {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(initialConnected)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number } | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const activeStep = !isConnected ? 1 : !syncDone ? 2 : 3

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/calendar/sync')
      const data = await res.json()
      if (data.needsGoogle) {
        setIsConnected(false)
        setSyncError('Google account not connected. Please complete step 1 first.')
      } else if (data.error) {
        setSyncError(`Sync failed: ${data.error}`)
      } else {
        setSyncResult({ synced: data.synced })
        setSyncDone(true)
        router.refresh()
      }
    } catch {
      setSyncError('Network error — please try again.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/calendar" className="text-sm text-muted hover:text-white transition-colors mb-4 inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calendar
        </Link>
        <div className="flex items-center gap-3 mt-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Google Calendar Sync</h1>
            <p className="text-muted text-sm mt-0.5">Connect and sync your Google Calendar events</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((step, i) => (
          <div key={step.number} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors',
              activeStep > step.number
                ? 'bg-green-500 text-white'
                : activeStep === step.number
                  ? 'bg-accent text-white'
                  : 'bg-surface-2 text-subtle border border-border'
            )}>
              {activeStep > step.number ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : step.number}
            </div>
            <span className={cn(
              'text-xs font-medium hidden sm:block',
              activeStep === step.number ? 'text-white' : activeStep > step.number ? 'text-green-400' : 'text-subtle'
            )}>
              {step.title}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-px flex-1 transition-colors',
                activeStep > step.number + 1 ? 'bg-green-500/40' : activeStep > step.number ? 'bg-accent/40' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step cards */}
      <div className="space-y-3">

        {/* Step 1 — Connect */}
        <div className={cn(
          'card p-5 transition-all',
          activeStep === 1 ? 'border-accent/40 shadow-accent/5 shadow-lg' : ''
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold',
              isConnected ? 'bg-green-500/20 text-green-400' : activeStep === 1 ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-subtle'
            )}>
              {isConnected ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : '1'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className={cn('font-semibold', isConnected ? 'text-green-400' : 'text-white')}>
                    {STEPS[0].title}
                  </h3>
                  <p className="text-sm text-muted mt-1">{STEPS[0].description}</p>
                  {isConnected && (
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {STEPS[0].completedLabel}
                    </p>
                  )}
                </div>
                {!isConnected && (
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/calendar/setup' })}
                    className="btn-primary flex items-center gap-2 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Connect with Google
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 — Sync */}
        <div className={cn(
          'card p-5 transition-all',
          !isConnected ? 'opacity-50' : activeStep === 2 ? 'border-accent/40 shadow-accent/5 shadow-lg' : ''
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold',
              syncDone ? 'bg-green-500/20 text-green-400' : activeStep === 2 ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-subtle'
            )}>
              {syncDone ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : '2'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className={cn('font-semibold', syncDone ? 'text-green-400' : 'text-white')}>
                    {STEPS[1].title}
                  </h3>
                  <p className="text-sm text-muted mt-1">{STEPS[1].description}</p>
                  {syncResult && (
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Imported {syncResult.synced} event{syncResult.synced !== 1 ? 's' : ''} from Google Calendar
                    </p>
                  )}
                  {syncError && (
                    <p className="text-xs text-red-400 mt-2">{syncError}</p>
                  )}
                </div>
                {isConnected && !syncDone && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="btn-primary flex items-center gap-2 flex-shrink-0"
                  >
                    <svg className={cn('w-4 h-4', syncing && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {syncing ? 'Syncing…' : 'Sync Now'}
                  </button>
                )}
                {syncDone && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="btn-ghost text-sm flex items-center gap-1.5 flex-shrink-0"
                  >
                    <svg className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 — Done */}
        <div className={cn(
          'card p-5 transition-all',
          !syncDone ? 'opacity-50' : 'border-green-500/30'
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold',
              syncDone ? 'bg-green-500/20 text-green-400' : 'bg-surface-2 text-subtle'
            )}>
              {syncDone ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : '3'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={cn('font-semibold', syncDone ? 'text-green-400' : 'text-white')}>
                {STEPS[2].title}
              </h3>
              <p className="text-sm text-muted mt-1">{STEPS[2].description}</p>
              {syncDone && (
                <Link href="/calendar" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  View Calendar
                </Link>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Notes */}
      <div className="mt-6 p-4 rounded-lg bg-surface-2 border border-border">
        <p className="text-xs text-subtle font-medium mb-2 uppercase tracking-wider">Notes</p>
        <ul className="space-y-1.5">
          <li className="text-xs text-muted flex gap-2">
            <span className="text-subtle flex-shrink-0">·</span>
            Google Calendar events are read-only — changes made in the app are not pushed back to Google.
          </li>
          <li className="text-xs text-muted flex gap-2">
            <span className="text-subtle flex-shrink-0">·</span>
            Sync can be re-run at any time from the Calendar page using the &quot;Sync Google&quot; button.
          </li>
          <li className="text-xs text-muted flex gap-2">
            <span className="text-subtle flex-shrink-0">·</span>
            Only your primary calendar is synced. All-day events are supported.
          </li>
          <li className="text-xs text-muted flex gap-2">
            <span className="text-subtle flex-shrink-0">·</span>
            Deleted Google events are not automatically removed — delete them manually if needed.
          </li>
        </ul>
      </div>
    </div>
  )
}
