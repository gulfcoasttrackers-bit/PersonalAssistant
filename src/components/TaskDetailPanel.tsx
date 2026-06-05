'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatDate, isPast } from '@/lib/utils'
import { TaskType } from './TaskItem'

interface ProjectOption {
  id: string
  title: string
  color: string
}

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

interface Props {
  task: TaskType
  onClose: () => void
  onUpdate?: () => void
}

export function TaskDetailPanel({ task, onClose, onUpdate }: Props) {
  const router = useRouter()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState(task.priority)
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : '')
  const [projectId, setProjectId] = useState(task.projectId ?? '')
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtasks, setSubtasks] = useState(task.subtasks)
  const [completed, setCompleted] = useState(task.completed)

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : [])
      .then((data: ProjectOption[]) => setProjects(data))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    router.refresh()
    onUpdate?.()
  }

  async function saveTitle() {
    if (title.trim() && title.trim() !== task.title) await patch({ title: title.trim() })
  }

  async function saveDescription() {
    const val = description.trim() || null
    if (val !== (task.description ?? null)) await patch({ description: val })
  }

  async function savePriority(val: TaskType['priority']) {
    setPriority(val)
    await patch({ priority: val })
  }

  async function saveDueDate(val: string) {
    setDueDate(val)
    await patch({ dueDate: val ? new Date(val + 'T23:59:59.000Z').toISOString() : null })
  }

  async function saveProject(val: string) {
    setProjectId(val)
    await patch({ projectId: val || null })
  }

  async function toggleComplete() {
    const next = !completed
    setCompleted(next)
    await patch({ completed: next })
  }

  async function toggleSubtask(sub: TaskType) {
    await fetch(`/api/tasks/${sub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !sub.completed }),
    })
    setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s))
    router.refresh()
    onUpdate?.()
  }

  async function submitSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubtask.trim()) return
    setAddingSubtask(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newSubtask.trim(), parentId: task.id, projectId: task.projectId }),
    })
    if (res.ok) {
      const created: TaskType = await res.json()
      setSubtasks(prev => [...prev, created])
    }
    setNewSubtask('')
    setAddingSubtask(false)
    router.refresh()
    onUpdate?.()
  }

  const overdueDate = dueDate && !completed && isPast(dueDate + 'T23:59:59')
  const currentProject = projects.find(p => p.id === projectId)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleComplete}
              className={cn(
                'w-4 h-4 rounded border transition-colors flex-shrink-0',
                completed ? 'bg-accent border-accent' : 'border-border-focus hover:border-accent'
              )}
              aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {completed && (
                <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className="text-xs text-muted">{completed ? 'Completed' : 'In progress'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-subtle hover:text-muted rounded transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Title */}
          <input
            ref={titleRef}
            className="w-full bg-transparent text-xl font-semibold text-white placeholder:text-subtle focus:outline-none border-b border-transparent focus:border-border pb-1 transition-colors"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur() }
            }}
            placeholder="Task title"
          />

          {/* Notes */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Notes</label>
            <textarea
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-subtle focus:outline-none focus:border-border-focus resize-none transition-colors"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Add notes…"
            />
          </div>

          {/* Details */}
          <div className="space-y-3">
            <p className="text-xs text-muted">Details</p>

            {/* Priority buttons */}
            <div className="flex items-start gap-3">
              <span className="text-xs text-subtle w-20 flex-shrink-0 mt-1.5">Priority</span>
              <div className="flex gap-1.5 flex-wrap">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => savePriority(p)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-all',
                      priority === p
                        ? 'border-transparent font-medium'
                        : 'border-border text-muted hover:border-border-focus'
                    )}
                    style={priority === p ? {
                      backgroundColor:
                        p === 'URGENT' ? '#f87171' :
                        p === 'HIGH'   ? '#fb923c' :
                        p === 'MEDIUM' ? '#facc15' : '#52525b',
                      color: p === 'MEDIUM' ? '#1a1a1a' : 'white',
                    } : undefined}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-subtle w-20 flex-shrink-0">Due date</span>
              <input
                type="date"
                className={cn('input text-sm py-1 max-w-[180px]', overdueDate && 'text-red-400')}
                value={dueDate}
                onChange={e => saveDueDate(e.target.value)}
              />
              {dueDate && (
                <button
                  onClick={() => saveDueDate('')}
                  className="text-xs text-subtle hover:text-muted transition-colors"
                  title="Clear due date"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Project — top-level tasks only */}
            {!task.parentId && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-subtle w-20 flex-shrink-0">Project</span>
                <select
                  className="input text-sm py-1 flex-1 max-w-[200px]"
                  value={projectId}
                  onChange={e => saveProject(e.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                {currentProject && (
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: currentProject.color + '22', color: currentProject.color }}
                  >
                    {currentProject.title}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <p className="text-xs text-muted mb-2">
              Subtasks
              {subtasks.length > 0 && (
                <span className="ml-1 text-subtle">
                  ({subtasks.filter(s => s.completed).length}/{subtasks.length} done)
                </span>
              )}
            </p>
            <div className="space-y-1">
              {subtasks.map(sub => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <button
                    onClick={() => toggleSubtask(sub)}
                    className={cn(
                      'w-4 h-4 rounded border flex-shrink-0 transition-colors',
                      sub.completed ? 'bg-accent border-accent' : 'border-border-focus hover:border-accent'
                    )}
                  >
                    {sub.completed && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={cn('text-sm flex-1', sub.completed && 'line-through text-muted')}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={submitSubtask} className="flex gap-2 mt-2">
              <input
                className="input text-sm py-1.5 flex-1"
                placeholder="Add subtask…"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary text-xs py-1.5 px-3"
                disabled={addingSubtask || !newSubtask.trim()}
              >
                Add
              </button>
            </form>
          </div>

          {/* Due date summary */}
          {dueDate && (
            <p className="text-xs text-subtle">
              Due {formatDate(dueDate + 'T12:00:00')}
              {overdueDate && <span className="text-red-400 ml-1">· Overdue</span>}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
