'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  description?: string | null
}

interface TaskDue {
  id: string
  title: string
  dueDate: string
  completed: boolean
  priority: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6 AM – 10 PM

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'bg-red-400/80',
  HIGH: 'bg-orange-400/80',
  MEDIUM: 'bg-yellow-400/80',
  LOW: 'bg-zinc-500/80',
}

type ViewMode = 'month' | 'week' | 'day'

function pad(n: number) { return String(n).padStart(2, '0') }

function toDatetimeLocal(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStartForDay(date: Date, hour = 9): string {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(hour)}:00`
}

function defaultEndForDay(date: Date, hour = 10): string {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(hour)}:00`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function getWeekStart(d: Date): Date {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

// ─── Event Modal ────────────────────────────────────────────────────────────

interface EventModalProps {
  mode: 'create' | 'edit'
  initial: {
    title: string
    description: string
    startTime: string
    endTime: string
    allDay: boolean
  }
  onSave: (data: { title: string; description: string; startTime: string; endTime: string; allDay: boolean }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

function EventModal({ mode, initial, onSave, onDelete, onClose }: EventModalProps) {
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [allDay, setAllDay] = useState(initial.allDay)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || (!allDay && (!startTime || !endTime))) return
    setSaving(true)
    await onSave({ title: title.trim(), description: description.trim(), startTime, endTime, allDay })
    setSaving(false)
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-white">
            {mode === 'create' ? 'New event' : 'Edit event'}
          </h2>
          <button onClick={onClose} className="p-1 text-subtle hover:text-muted rounded transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Title */}
          <input
            className="input w-full"
            placeholder="Event title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            required
          />

          {/* Description */}
          <textarea
            className="input w-full resize-none"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />

          {/* All day toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setAllDay(a => !a)}
              className={cn(
                'w-9 h-5 rounded-full transition-colors duration-200 flex items-center px-0.5 flex-shrink-0',
                allDay ? 'bg-accent' : 'bg-surface-2'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                allDay ? 'translate-x-4' : 'translate-x-0'
              )} />
            </div>
            <span className="text-sm text-muted">All day</span>
          </label>

          {/* Times */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">Start</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={startTime}
                  onChange={e => {
                    setStartTime(e.target.value)
                    // Auto-advance end by 1h if end is before new start
                    if (e.target.value && endTime <= e.target.value) {
                      const d = new Date(e.target.value)
                      d.setHours(d.getHours() + 1)
                      setEndTime(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
                    }
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">End</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <div>
              {mode === 'edit' && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Delete event'}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || !title.trim()}
              >
                {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main CalendarClient ─────────────────────────────────────────────────────

type ModalState =
  | { type: 'none' }
  | { type: 'create'; date: Date; hour?: number }
  | { type: 'edit'; event: CalendarEvent }

export function CalendarClient({ events: initialEvents, tasks }: { events: CalendarEvent[]; tasks: TaskDue[] }) {
  const router = useRouter()
  const today = new Date()
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState(initialEvents)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [needsGoogle, setNeedsGoogle] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const dolphinHouseImportInputRef = useRef<HTMLInputElement | null>(null)

  const DOLPHIN_HOUSE_ICS_FILES = new Set([
    'dolphin-house-open-tasks.ics',
    'dolphin-house-maintenance-tasks.ics',
    'dolphin-house-upgrade-tasks.ics',
  ])

  // ── Navigation ──────────────────────────────────────────────────────────
  function prev() {
    if (view === 'day') setCurrentDate(d => addDays(d, -1))
    else if (view === 'week') setCurrentDate(d => addDays(d, -7))
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function next() {
    if (view === 'day') setCurrentDate(d => addDays(d, 1))
    else if (view === 'week') setCurrentDate(d => addDays(d, 7))
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  function goToday() { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate())) }

  function navLabel(): string {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (view === 'week') {
      const start = getWeekStart(currentDate)
      const end = addDays(start, 6)
      const startStr = `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`
      const endStr = start.getMonth() === end.getMonth()
        ? String(end.getDate())
        : `${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`
      return `${startStr} – ${endStr}, ${end.getFullYear()}`
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }

  // ── Sync ────────────────────────────────────────────────────────────────
  async function handleSync() {
    setSyncing(true)
    setSyncStatus(null)
    setNeedsGoogle(false)
    try {
      const res = await fetch('/api/calendar/sync')
      const data = await res.json()
      if (data.needsGoogle) {
        setNeedsGoogle(true)
      } else if (data.error) {
        setSyncStatus(`Error: ${data.error}`)
      } else {
        setSyncStatus(`Synced ${data.synced} event${data.synced !== 1 ? 's' : ''} from Google`)
        router.refresh()
      }
    } catch {
      setSyncStatus('Sync failed — check your connection')
    } finally {
      setSyncing(false)
    }
  }

  async function handleExportIcs() {
    setExporting(true)
    setSyncStatus(null)

    const rangeStart = new Date(currentDate)
    const rangeEnd = new Date(currentDate)

    if (view === 'month') {
      rangeStart.setDate(1)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd.setMonth(rangeEnd.getMonth() + 1, 0)
      rangeEnd.setHours(23, 59, 59, 999)
    } else if (view === 'week') {
      const weekStartDate = getWeekStart(currentDate)
      rangeStart.setTime(weekStartDate.getTime())
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd.setTime(addDays(weekStartDate, 6).getTime())
      rangeEnd.setHours(23, 59, 59, 999)
    } else {
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd.setHours(23, 59, 59, 999)
    }

    try {
      const params = new URLSearchParams({
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      })
      const res = await fetch(`/api/calendar/export?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        setSyncStatus(`Export failed: ${data.error || 'Unknown error'}`)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `personal-assistant-calendar.ics`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setSyncStatus('ICS export downloaded successfully')
    } catch {
      setSyncStatus('Export failed — check your connection')
    } finally {
      setExporting(false)
    }
  }

  async function importSingleIcs(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/calendar/import', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    return { ok: res.ok, data }
  }

  function resetImportInputs() {
    if (importInputRef.current) {
      importInputRef.current.value = ''
    }
    if (dolphinHouseImportInputRef.current) {
      dolphinHouseImportInputRef.current.value = ''
    }
  }

  async function handleImportFiles(files: File[], source: 'generic' | 'dolphin-house') {
    setImporting(true)
    setSyncStatus(null)

    try {
      if (files.length === 0) {
        setSyncStatus('Import failed: no ICS file selected')
        return
      }

      const totals = { imported: 0, updated: 0, skipped: 0, conflicts: 0 }
      const failures: string[] = []
      let skippedNonDolphinFiles = 0

      const recognizedDolphinFiles = source === 'dolphin-house'
        ? files.filter((file) => DOLPHIN_HOUSE_ICS_FILES.has(file.name.toLowerCase())).length
        : 0

      const filesToImport = source === 'dolphin-house'
        ? files.filter((file) => DOLPHIN_HOUSE_ICS_FILES.has(file.name.toLowerCase()))
        : files

      if (source === 'dolphin-house') {
        skippedNonDolphinFiles = files.length - filesToImport.length
        if (filesToImport.length === 0) {
          setSyncStatus('Import failed: no recognized Dolphin House export files selected')
          return
        }
      }

      for (const file of filesToImport) {
        const result = await importSingleIcs(file)
        if (!result.ok) {
          failures.push(`${file.name}: ${result.data?.error || 'Unknown error'}`)
          continue
        }

        totals.imported += result.data?.imported ?? 0
        totals.updated += result.data?.updated ?? 0
        totals.skipped += result.data?.skipped ?? 0
        totals.conflicts += result.data?.conflicts ?? 0
      }

      const successCount = filesToImport.length - failures.length
      if (successCount === 0) {
        setSyncStatus(`Import failed: ${failures[0] || 'Unknown error'}`)
        return
      }

      const parts = [
        `Imported ${totals.imported}`,
        `updated ${totals.updated}`,
      ]
      if (totals.conflicts > 0) {
        parts.push(`conflicts ${totals.conflicts}`)
      }
      if (totals.skipped > 0) {
        parts.push(`skipped ${totals.skipped}`)
      }
      if (filesToImport.length > 1 || files.length > filesToImport.length) {
        parts.push(`files ${successCount}/${filesToImport.length}`)
      }
      if (recognizedDolphinFiles > 0 && source === 'dolphin-house') {
        parts.push(`recognized Dolphin House exports ${recognizedDolphinFiles}`)
      }
      if (skippedNonDolphinFiles > 0) {
        parts.push(`non-HAD files skipped ${skippedNonDolphinFiles}`)
      }
      if (failures.length > 0) {
        parts.push(`failed ${failures.length}`)
      }

      const label = source === 'dolphin-house' ? 'Dolphin House import complete' : 'ICS import complete'
      setSyncStatus(`${label}: ${parts.join(' · ')}`)

      router.refresh()
    } catch {
      setSyncStatus('Import failed — check the file and try again')
    } finally {
      setImporting(false)
      resetImportInputs()
    }
  }

  // ── Event helpers ────────────────────────────────────────────────────────
  function getEventsForDay(day: Date) {
    return events.filter(e => isSameDay(new Date(e.startTime), day))
  }
  function getTasksForDay(day: Date) {
    return tasks.filter(t => isSameDay(new Date(t.dueDate), day))
  }
  function getEventsForDayAtHour(day: Date, h: number) {
    return events.filter(e => !e.allDay && isSameDay(new Date(e.startTime), day) && new Date(e.startTime).getHours() === h)
  }
  function getAllDayForDay(day: Date) {
    return events.filter(e => e.allDay && isSameDay(new Date(e.startTime), day))
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async function handleCreate(data: { title: string; description: string; startTime: string; endTime: string; allDay: boolean }) {
    const startDate = modal.type === 'create' ? modal.date : new Date()
    let startISO: string, endISO: string
    if (data.allDay) {
      startISO = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0).toISOString()
      endISO   = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59).toISOString()
    } else {
      startISO = new Date(data.startTime).toISOString()
      endISO   = new Date(data.endTime).toISOString()
    }
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: data.title, description: data.description || undefined, startTime: startISO, endTime: endISO, allDay: data.allDay }),
    })
    if (res.ok) { const newEv: CalendarEvent = await res.json(); setEvents(prev => [...prev, newEv]) }
    setModal({ type: 'none' })
    router.refresh()
  }

  async function handleEdit(data: { title: string; description: string; startTime: string; endTime: string; allDay: boolean }) {
    if (modal.type !== 'edit') return
    const id = modal.event.id
    const body: Record<string, unknown> = { title: data.title, description: data.description || null, allDay: data.allDay }
    if (!data.allDay) { body.startTime = new Date(data.startTime).toISOString(); body.endTime = new Date(data.endTime).toISOString() }
    const res = await fetch(`/api/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { const updated: CalendarEvent = await res.json(); setEvents(ev => ev.map(e => e.id === id ? updated : e)) }
    setModal({ type: 'none' })
    router.refresh()
  }

  async function handleDelete() {
    if (modal.type !== 'edit') return
    const id = modal.event.id
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    setEvents(ev => ev.filter(e => e.id !== id))
    setModal({ type: 'none' })
    router.refresh()
  }

  // ── Month grid data ───────────────────────────────────────────────────────
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from<null>({ length: firstDay }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // ── Week data ─────────────────────────────────────────────────────────────
  const weekStart = getWeekStart(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // ── Upcoming list (month view) ────────────────────────────────────────────
  const upcomingEvents = [...events]
    .filter(e => new Date(e.startTime).getMonth() === month && new Date(e.startTime).getFullYear() === year)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  return (
    <div className="animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Calendar</h1>
          <p className="text-muted mt-1">Events and deadlines</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {syncStatus && <span className="text-xs text-muted">{syncStatus}</span>}
          <input
            ref={importInputRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleImportFiles([file], 'generic')
              }
            }}
          />
          <input
            ref={dolphinHouseImportInputRef}
            type="file"
            multiple
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              if (files.length > 0) {
                void handleImportFiles(files, 'dolphin-house')
              }
            }}
          />
          {needsGoogle ? (
            <Link href="/calendar/setup" className="btn-ghost text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connect Google Calendar
            </Link>
          ) : (
            <button className="btn-ghost text-sm flex items-center gap-1.5" onClick={handleSync} disabled={syncing}>
              <svg className={cn('w-4 h-4', syncing && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync Google'}
            </button>
          )}
          <button className="btn-ghost text-sm" onClick={handleExportIcs} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export ICS'}
          </button>
          <button className="btn-ghost text-sm" onClick={() => dolphinHouseImportInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import Dolphin House Tasks'}
          </button>
          <button className="btn-ghost text-sm" onClick={() => importInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import ICS'}
          </button>
          <button className="btn-primary" onClick={() => setModal({ type: 'create', date: today })}>
            Add event
          </button>
        </div>
      </div>

      {/* ── View switcher + nav ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        {/* Prev / Next */}
        <button onClick={prev} className="btn-ghost p-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-white text-base flex-1 text-center">{navLabel()}</span>
        <button onClick={next} className="btn-ghost p-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Today button */}
        <button onClick={goToday} className="btn-ghost text-sm px-3">Today</button>

        {/* View tabs */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(['day', 'week', 'month'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-sm capitalize transition-colors',
                view === v ? 'bg-accent text-white' : 'text-muted hover:text-white hover:bg-surface-2'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Month view ─────────────────────────────────────────────────── */}
      {view === 'month' && (
        <>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs text-muted py-2 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const cellDate = day ? new Date(year, month, day) : null
                const isToday = cellDate ? isSameDay(cellDate, today) : false
                const dayEvents = cellDate ? getEventsForDay(cellDate) : []
                const dayTasks  = cellDate ? getTasksForDay(cellDate)  : []
                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-[80px] p-1.5 border-b border-r border-border last:border-r-0',
                      i >= cells.length - 7 && 'border-b-0',
                      day === null && 'bg-surface/30',
                      day && 'cursor-pointer hover:bg-surface-2/50 transition-colors'
                    )}
                    onClick={() => { if (day) setModal({ type: 'create', date: new Date(year, month, day) }) }}
                  >
                    {day !== null && (
                      <>
                        <span className={cn(
                          'text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full',
                          isToday ? 'bg-accent text-white' : 'text-muted'
                        )}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map(ev => (
                            <div key={ev.id} className="text-[10px] bg-accent/20 text-accent rounded px-1 truncate hover:bg-accent/30 transition-colors"
                              onClick={e => { e.stopPropagation(); setModal({ type: 'edit', event: ev }) }}>
                              {ev.title}
                            </div>
                          ))}
                          {dayTasks.slice(0, 2).map(t => (
                            <div key={t.id} className={cn('text-[10px] rounded px-1 truncate text-white/80', PRIORITY_COLOR[t.priority])}>
                              {t.title}
                            </div>
                          ))}
                          {dayEvents.length + dayTasks.length > 2 && (
                            <div className="text-[10px] text-subtle px-1">+{dayEvents.length + dayTasks.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming list */}
          {upcomingEvents.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">Upcoming this month</h2>
              <div className="space-y-2">
                {upcomingEvents.map(ev => {
                  const start = new Date(ev.startTime)
                  return (
                    <div key={ev.id} className="card p-3 flex items-center gap-3 hover:bg-surface-2 transition-colors cursor-pointer group"
                      onClick={() => setModal({ type: 'edit', event: ev })}>
                      <div className="w-1 h-8 rounded-full bg-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {ev.allDay
                            ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            : `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                          }
                        </p>
                        {ev.description && <p className="text-xs text-subtle mt-0.5 truncate">{ev.description}</p>}
                      </div>
                      <svg className="w-4 h-4 text-subtle opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110.414 16H9v-1.414A2 2 0 019.586 13z" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Week view ──────────────────────────────────────────────────── */}
      {view === 'week' && (
        <div className="card overflow-hidden">
          {/* Day headers */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            <div />
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today)
              return (
                <div key={i} className="text-center py-2 border-l border-border">
                  <p className="text-xs text-muted">{DAYS[day.getDay()]}</p>
                  <p className={cn(
                    'text-sm font-semibold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full',
                    isToday ? 'bg-accent text-white' : 'text-white'
                  )}>
                    {day.getDate()}
                  </p>
                </div>
              )
            })}
          </div>

          {/* All-day row */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            <div className="text-[10px] text-muted py-1.5 px-1 text-right self-center leading-tight">All<br/>day</div>
            {weekDays.map((day, i) => {
              const allDay  = getAllDayForDay(day)
              const dayTasks = getTasksForDay(day)
              return (
                <div key={i} className="border-l border-border p-1 min-h-[32px]">
                  {allDay.map(ev => (
                    <div key={ev.id} className="text-[10px] bg-accent/20 text-accent rounded px-1 truncate cursor-pointer mb-0.5 hover:bg-accent/30"
                      onClick={() => setModal({ type: 'edit', event: ev })}>{ev.title}</div>
                  ))}
                  {dayTasks.map(t => (
                    <div key={t.id} className={cn('text-[10px] rounded px-1 truncate text-white/80 mb-0.5', PRIORITY_COLOR[t.priority])}>{t.title}</div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Hour rows */}
          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            {HOURS.map(h => (
              <div key={h} className="grid border-b border-border/50" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
                <div className="text-[10px] text-muted pt-1.5 px-1 text-right">{formatHour(h)}</div>
                {weekDays.map((day, i) => {
                  const hourEvents = getEventsForDayAtHour(day, h)
                  return (
                    <div key={i} className="border-l border-border min-h-[48px] px-1 py-0.5 hover:bg-surface-2/30 cursor-pointer transition-colors"
                      onClick={() => setModal({ type: 'create', date: day, hour: h })}>
                      {hourEvents.map(ev => {
                        const start = new Date(ev.startTime)
                        const end   = new Date(ev.endTime)
                        const dur = Math.round((end.getTime() - start.getTime()) / 60000)
                        return (
                          <div key={ev.id} className="text-[10px] bg-accent/20 text-accent rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer hover:bg-accent/30"
                            onClick={e => { e.stopPropagation(); setModal({ type: 'edit', event: ev }) }}>
                            <span className="font-medium">{ev.title}</span>
                            {dur > 0 && <span className="text-accent/70 ml-1">{dur}m</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Day view ───────────────────────────────────────────────────── */}
      {view === 'day' && (
        <div className="card overflow-hidden">
          {/* All-day + tasks */}
          {(() => {
            const allDay   = getAllDayForDay(currentDate)
            const dayTasks = getTasksForDay(currentDate)
            if (allDay.length + dayTasks.length === 0) return null
            return (
              <div className="flex border-b border-border">
                <div className="w-16 flex-shrink-0 text-[10px] text-muted py-2 px-2 text-right leading-tight">All<br/>day</div>
                <div className="flex-1 p-2 flex flex-wrap gap-1">
                  {allDay.map(ev => (
                    <span key={ev.id} className="text-xs bg-accent/20 text-accent rounded px-1.5 py-0.5 cursor-pointer hover:bg-accent/30"
                      onClick={() => setModal({ type: 'edit', event: ev })}>{ev.title}</span>
                  ))}
                  {dayTasks.map(t => (
                    <span key={t.id} className={cn('text-xs rounded px-1.5 py-0.5 text-white/80', PRIORITY_COLOR[t.priority])}>{t.title}</span>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Hour rows */}
          <div className="overflow-y-auto" style={{ maxHeight: '560px' }}>
            {HOURS.map(h => {
              const hourEvents = getEventsForDayAtHour(currentDate, h)
              const isCurrentHour = isSameDay(currentDate, today) && today.getHours() === h
              return (
                <div key={h}
                  className={cn(
                    'flex border-b border-border/50 min-h-[56px] hover:bg-surface-2/30 cursor-pointer transition-colors group',
                    isCurrentHour && 'bg-accent/5'
                  )}
                  onClick={() => setModal({ type: 'create', date: currentDate, hour: h })}
                >
                  <div className={cn('w-16 flex-shrink-0 text-xs pt-1.5 px-2 text-right', isCurrentHour ? 'text-accent font-medium' : 'text-muted')}>
                    {formatHour(h)}
                  </div>
                  <div className="flex-1 px-2 py-1 space-y-0.5">
                    {hourEvents.map(ev => {
                      const start = new Date(ev.startTime)
                      const end   = new Date(ev.endTime)
                      const dur = Math.round((end.getTime() - start.getTime()) / 60000)
                      return (
                        <div key={ev.id} className="text-sm bg-accent/20 text-accent rounded px-2 py-1.5 cursor-pointer hover:bg-accent/30"
                          onClick={e => { e.stopPropagation(); setModal({ type: 'edit', event: ev }) }}>
                          <p className="font-medium leading-tight">{ev.title}</p>
                          <p className="text-xs text-accent/70 mt-0.5">
                            {pad(start.getHours())}:{pad(start.getMinutes())} – {pad(end.getHours())}:{pad(end.getMinutes())}
                            {dur > 0 && ` · ${dur < 60 ? `${dur}m` : `${(dur/60).toFixed(dur%60===0?0:1)}h`}`}
                          </p>
                          {ev.description && <p className="text-xs text-accent/60 mt-0.5 truncate">{ev.description}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {modal.type === 'create' && (
        <EventModal
          mode="create"
          initial={{
            title: '',
            description: '',
            startTime: defaultStartForDay(modal.date, modal.hour ?? 9),
            endTime: defaultEndForDay(modal.date, (modal.hour ?? 9) + 1),
            allDay: false,
          }}
          onSave={handleCreate}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'edit' && (
        <EventModal
          mode="edit"
          initial={{
            title: modal.event.title,
            description: modal.event.description ?? '',
            startTime: toDatetimeLocal(modal.event.startTime),
            endTime: toDatetimeLocal(modal.event.endTime),
            allDay: modal.event.allDay,
          }}
          onSave={handleEdit}
          onDelete={handleDelete}
          onClose={() => setModal({ type: 'none' })}
        />
      )}
    </div>
  )
}
