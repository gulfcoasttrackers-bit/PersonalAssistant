'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'bg-red-400/80',
  HIGH: 'bg-orange-400/80',
  MEDIUM: 'bg-yellow-400/80',
  LOW: 'bg-zinc-500/80',
}

function pad(n: number) { return String(n).padStart(2, '0') }

function toDatetimeLocal(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStartForDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T09:00`
}

function defaultEndForDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T10:00`
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
  | { type: 'create'; date: Date }
  | { type: 'edit'; event: CalendarEvent }

export function CalendarClient({ events: initialEvents, tasks }: { events: CalendarEvent[]; tasks: TaskDue[] }) {
  const router = useRouter()
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState(initialEvents)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() { setCurrentDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setCurrentDate(new Date(year, month + 1, 1)) }

  function getEventsForDay(day: number) {
    const d = new Date(year, month, day)
    return events.filter(e => new Date(e.startTime).toDateString() === d.toDateString())
  }

  function getTasksForDay(day: number) {
    const d = new Date(year, month, day)
    return tasks.filter(t => new Date(t.dueDate).toDateString() === d.toDateString())
  }

  async function handleCreate(data: { title: string; description: string; startTime: string; endTime: string; allDay: boolean }) {
    const startDate = modal.type === 'create' ? modal.date : new Date()

    let startISO: string
    let endISO: string

    if (data.allDay) {
      const d = startDate
      startISO = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString()
      endISO = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()
    } else {
      startISO = new Date(data.startTime).toISOString()
      endISO = new Date(data.endTime).toISOString()
    }

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        description: data.description || undefined,
        startTime: startISO,
        endTime: endISO,
        allDay: data.allDay,
      }),
    })

    if (res.ok) {
      const newEvent: CalendarEvent = await res.json()
      setEvents(ev => [...ev, newEvent])
    }
    setModal({ type: 'none' })
    router.refresh()
  }

  async function handleEdit(data: { title: string; description: string; startTime: string; endTime: string; allDay: boolean }) {
    if (modal.type !== 'edit') return
    const id = modal.event.id

    const body: Record<string, unknown> = {
      title: data.title,
      description: data.description || null,
      allDay: data.allDay,
    }
    if (!data.allDay) {
      body.startTime = new Date(data.startTime).toISOString()
      body.endTime = new Date(data.endTime).toISOString()
    }

    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const updated: CalendarEvent = await res.json()
      setEvents(ev => ev.map(e => e.id === id ? updated : e))
    }
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

  const cells: (number | null)[] = [
    ...Array.from<null>({ length: firstDay }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // Sort upcoming events for the list below
  const upcomingEvents = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Calendar</h1>
          <p className="text-muted mt-1">Events and deadlines</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setModal({ type: 'create', date: today })}
        >
          Add event
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={prevMonth} className="btn-ghost p-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-white text-lg flex-1 text-center">
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} className="btn-ghost p-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs text-muted py-2 font-medium">{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day !== null && new Date(year, month, day).toDateString() === today.toDateString()
            const dayEvents = day ? getEventsForDay(day) : []
            const dayTasks = day ? getTasksForDay(day) : []

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[80px] p-1.5 border-b border-r border-border last:border-r-0',
                  i >= cells.length - 7 && 'border-b-0',
                  day === null && 'bg-surface/30',
                  day && 'cursor-pointer hover:bg-surface-2/50 transition-colors'
                )}
                onClick={() => {
                  if (day) setModal({ type: 'create', date: new Date(year, month, day) })
                }}
              >
                {day !== null && (
                  <>
                    <span
                      className={cn(
                        'text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full',
                        isToday ? 'bg-accent text-white' : 'text-muted'
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className="text-[10px] bg-accent/20 text-accent rounded px-1 truncate hover:bg-accent/30 transition-colors"
                          onClick={e => {
                            e.stopPropagation()
                            setModal({ type: 'edit', event: ev })
                          }}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayTasks.slice(0, 2).map(t => (
                        <div
                          key={t.id}
                          className={cn(
                            'text-[10px] rounded px-1 truncate text-white/80',
                            PRIORITY_COLOR[t.priority]
                          )}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayEvents.length + dayTasks.length > 2 && (
                        <div className="text-[10px] text-subtle px-1">
                          +{dayEvents.length + dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming events list */}
      {upcomingEvents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-3">
            Upcoming this month
          </h2>
          <div className="space-y-2">
            {upcomingEvents.map(ev => {
              const start = new Date(ev.startTime)
              return (
                <div
                  key={ev.id}
                  className="card p-3 flex items-center gap-3 hover:bg-surface-2 transition-colors cursor-pointer group"
                  onClick={() => setModal({ type: 'edit', event: ev })}
                >
                  <div className="w-1 h-8 rounded-full bg-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {ev.allDay
                        ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        : `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                      }
                    </p>
                    {ev.description && (
                      <p className="text-xs text-subtle mt-0.5 truncate">{ev.description}</p>
                    )}
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

      {/* Event Modal */}
      {modal.type === 'create' && (
        <EventModal
          mode="create"
          initial={{
            title: '',
            description: '',
            startTime: defaultStartForDay(modal.date),
            endTime: defaultEndForDay(modal.date),
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

