export type AutoSyncInterval = 'off' | '15' | '60'

export const AUTO_SYNC_STORAGE_KEY = 'pa-google-calendar-auto-sync'

export function isAutoSyncInterval(value: string | null): value is AutoSyncInterval {
  return value === 'off' || value === '15' || value === '60'
}