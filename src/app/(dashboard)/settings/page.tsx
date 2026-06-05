'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { AUTO_SYNC_STORAGE_KEY, isAutoSyncInterval, type AutoSyncInterval } from '@/lib/calendarSync'

interface SyncHistoryItem {
  id: string
  trigger: string
  status: string
  synced: number
  skipped: number
  conflicts: number
  total: number
  detail: string | null
  createdAt: string
}

export default function SettingsPage() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [calendarLoading, setCalendarLoading] = useState(true)
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEventsCount, setGoogleEventsCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [calendarSyncing, setCalendarSyncing] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const [calendarSuccess, setCalendarSuccess] = useState('')
  const [autoSyncInterval, setAutoSyncInterval] = useState<AutoSyncInterval>('off')
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])

  const loadCalendarStatus = useCallback(async () => {
    setCalendarLoading(true)
    setCalendarError('')
    try {
      const res = await fetch('/api/calendar/status')
      const data = await res.json()
      if (!res.ok) {
        setCalendarError(data.error || 'Could not load calendar status')
        return
      }

      setGoogleConfigured(Boolean(data.googleConfigured))
      setGoogleConnected(Boolean(data.connected))
      setGoogleEventsCount(Number(data.googleEventsCount ?? 0))
      setLastSyncedAt(data.lastSyncedAt ?? null)
      setSyncHistory(Array.isArray(data.syncHistory) ? data.syncHistory : [])
    } catch {
      setCalendarError('Network error while loading calendar status')
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCalendarStatus()
  }, [loadCalendarStatus])

  useEffect(() => {
    const saved = window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY)
    if (isAutoSyncInterval(saved)) {
      setAutoSyncInterval(saved)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(AUTO_SYNC_STORAGE_KEY, autoSyncInterval)
    window.dispatchEvent(new Event('pa:auto-sync-changed'))
  }, [autoSyncInterval])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPass !== confirm) {
      setError('New passwords do not match')
      return
    }
    if (newPass.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setSuccess(true)
        setCurrent('')
        setNewPass('')
        setConfirm('')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleCalendarSync = useCallback(async () => {
    setCalendarError('')
    setCalendarSuccess('')
    setCalendarSyncing(true)

    try {
      const res = await fetch('/api/calendar/sync')
      const data = await res.json()

      if (!res.ok) {
        setCalendarError(data.error || 'Sync failed')
        return
      }
      if (data.needsGoogle) {
        setCalendarError('Google account not connected. Please connect first.')
        setGoogleConnected(false)
        return
      }

      const synced = Number(data.synced ?? 0)
      setCalendarSuccess(`Synced ${synced} event${synced === 1 ? '' : 's'} from Google Calendar.`)
      await loadCalendarStatus()
    } catch {
      setCalendarError('Network error while syncing calendar')
    } finally {
      setCalendarSyncing(false)
    }
  }, [loadCalendarStatus])

  return (
    <div className="animate-fade-in max-w-2xl space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-muted mt-1">Manage your account</p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">Current password</label>
            <input
              type="password"
              className="input w-full"
              placeholder="••••••••"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">New password</label>
            <input
              type="password"
              className="input w-full"
              placeholder="Min. 8 characters"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Confirm new password</label>
            <input
              type="password"
              className="input w-full"
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
              Password changed successfully.
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Google Calendar</h2>
            <p className="text-muted text-sm mt-1">Connect and sync your Google Calendar events</p>
          </div>
          {!calendarLoading && (
            <span
              className={
                googleConnected
                  ? 'text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2.5 py-1'
                  : 'text-xs text-zinc-300 bg-zinc-500/10 border border-zinc-500/20 rounded-full px-2.5 py-1'
              }
            >
              {googleConnected ? 'Connected' : 'Not connected'}
            </span>
          )}
        </div>

        {calendarLoading && <p className="text-sm text-muted">Loading calendar status...</p>}

        {!calendarLoading && !googleConfigured && (
          <p className="text-amber-300 text-sm bg-amber-400/10 border border-amber-300/20 rounded-lg px-3 py-2">
            Google OAuth is not configured in environment variables yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable connection.
          </p>
        )}

        {!calendarLoading && googleConfigured && (
          <div className="space-y-3">
            <div className="text-sm text-muted">
              Imported Google events: <span className="text-white font-medium">{googleEventsCount}</span>
            </div>
            <div className="text-sm text-muted">
              Last sync: <span className="text-white font-medium">{lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not synced yet'}</span>
            </div>
            <div>
              <p className="text-sm text-muted mb-2">Auto sync interval</p>
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                {(['off', '15', '60'] as AutoSyncInterval[]).map(option => {
                  const active = autoSyncInterval === option
                  const label = option === 'off' ? 'Off' : `${option} min`
                  return (
                    <button
                      key={option}
                      type="button"
                      className={
                        active
                          ? 'px-3 py-1.5 text-xs font-medium bg-accent-muted text-accent border-r last:border-r-0 border-border'
                          : 'px-3 py-1.5 text-xs text-muted hover:text-white hover:bg-surface-2 border-r last:border-r-0 border-border'
                      }
                      onClick={() => setAutoSyncInterval(option)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-subtle mt-1.5">
                Auto sync runs globally while you are using the dashboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {!googleConnected && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => signIn('google', { callbackUrl: '/settings' })}
                >
                  Connect Google Account
                </button>
              )}

              <button
                type="button"
                className="btn-ghost"
                onClick={handleCalendarSync}
                disabled={!googleConnected || calendarSyncing}
              >
                {calendarSyncing ? 'Syncing...' : 'Sync now'}
              </button>

              <Link href="/calendar/setup" className="btn-ghost">
                Open setup guide
              </Link>
            </div>
          </div>
        )}

        {calendarError && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mt-4">
            {calendarError}
          </p>
        )}
        {calendarSuccess && (
          <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2 mt-4">
            {calendarSuccess}
          </p>
        )}

        {syncHistory.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-white mb-2">Recent sync history</h3>
            <div className="space-y-2">
              {syncHistory.map(item => (
                <div key={item.id} className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-muted">
                      {new Date(item.createdAt).toLocaleString()} · {item.trigger}
                    </div>
                    <div className={item.status === 'success' ? 'text-green-400' : item.status === 'error' ? 'text-red-400' : 'text-amber-300'}>
                      {item.status}
                    </div>
                  </div>
                  <div className="text-subtle mt-1">
                    synced {item.synced} · skipped {item.skipped} · conflicts {item.conflicts} · total {item.total}
                  </div>
                  {item.detail && <div className="text-subtle mt-1">{item.detail}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
