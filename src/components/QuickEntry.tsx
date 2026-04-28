'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function QuickEntry() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Global shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTitle('')
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })

    setTitle('')
    setOpen(false)
    setSubmitting(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-accent hover:bg-accent-hover rounded-full flex items-center justify-center shadow-lg shadow-accent/20 transition-colors duration-150 z-40"
        title="Quick add task (⌘K)"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-32 px-4 z-50 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="w-full max-w-lg card shadow-2xl animate-slide-up">
        <form onSubmit={submit} className="p-4">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-white placeholder-muted focus:outline-none text-base"
              placeholder="Add a task…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <kbd className="text-xs text-subtle border border-border rounded px-1.5 py-0.5 hidden sm:block">
              ↵ to save
            </kbd>
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
            <button type="button" className="btn-ghost text-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary text-sm" disabled={!title.trim() || submitting}>
              {submitting ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
