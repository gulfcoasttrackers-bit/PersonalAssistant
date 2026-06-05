'use client'

import { useEffect, useState } from 'react'
import { AUTO_SYNC_STORAGE_KEY, isAutoSyncInterval, type AutoSyncInterval } from '@/lib/calendarSync'

export function CalendarAutoSyncAgent() {
  const [intervalSetting, setIntervalSetting] = useState<AutoSyncInterval>('off')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const syncFromStorage = () => {
      const saved = window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY)
      if (isAutoSyncInterval(saved)) {
        setIntervalSetting(saved)
      }
    }

    syncFromStorage()
    window.addEventListener('storage', syncFromStorage)
    window.addEventListener('pa:auto-sync-changed', syncFromStorage)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.removeEventListener('pa:auto-sync-changed', syncFromStorage)
    }
  }, [])

  useEffect(() => {
    if (intervalSetting === 'off') return

    const everyMs = Number(intervalSetting) * 60 * 1000
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== 'visible' || syncing) return
      setSyncing(true)
      try {
        await fetch('/api/calendar/sync?trigger=auto')
      } catch {
        // Silent by design: this background worker should not interrupt UX.
      } finally {
        setSyncing(false)
      }
    }, everyMs)

    return () => window.clearInterval(timer)
  }, [intervalSetting, syncing])

  return null
}