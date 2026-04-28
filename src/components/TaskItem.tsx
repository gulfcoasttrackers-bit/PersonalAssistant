'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatDate, isPast } from '@/lib/utils'

export interface TaskType {
  id: string
  title: string
  description?: string | null
  completed: boolean
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string | null
  order: number
  projectId?: string | null
  parentId?: string | null
  subtasks: TaskType[]
  project?: { id: string; title: string; color: string } | null
}

interface ProjectOption {
  id: string
  title: string
  color: string
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400/70',
  LOW: 'text-zinc-600',
}

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-400',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-yellow-400',
  LOW: 'bg-zinc-600',
}

interface TaskItemProps {
  task: TaskType
  depth?: number
  onUpdate?: () => void
}

export function TaskItem({ task, depth = 0, onUpdate }: TaskItemProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editPriority, setEditPriority] = useState(task.priority)
  const [editDueDate, setEditDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : ''
  )
  const [editProjectId, setEditProjectId] = useState(task.projectId ?? '')
  const [editSaving, setEditSaving] = useState(false)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)

  async function toggleComplete() {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    router.refresh()
    onUpdate?.()
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    setSubmitting(true)

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: subtaskTitle.trim(),
        parentId: task.id,
        projectId: task.projectId,
      }),
    })

    setSubtaskTitle('')
    setAdding(false)
    setSubmitting(false)
    setExpanded(true)
    router.refresh()
    onUpdate?.()
  }

  async function deleteTask() {
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    router.refresh()
    onUpdate?.()
  }

  async function openEdit() {
    setEditTitle(task.title)
    setEditPriority(task.priority)
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '')
    setEditProjectId(task.projectId ?? '')
    if (!projectsLoaded) {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data: ProjectOption[] = await res.json()
        setProjects(data)
        setProjectsLoaded(true)
      }
    }
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim()) return
    setEditSaving(true)

    const body: Record<string, unknown> = {
      title: editTitle.trim(),
      priority: editPriority,
      dueDate: editDueDate
        ? new Date(editDueDate + 'T23:59:59.000Z').toISOString()
        : null,
      projectId: editProjectId || null,
    }

    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setEditSaving(false)
    setEditing(false)
    router.refresh()
    onUpdate?.()
  }

  const hasSubtasks = task.subtasks.length > 0
  const overdueDate = task.dueDate && !task.completed && isPast(task.dueDate)

  return (
    <div className={cn('group', depth > 0 && 'ml-6 pl-4 border-l border-border')}>
      <div className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-surface-2 transition-colors duration-100">
        {/* Expand toggle */}
        {hasSubtasks || depth === 0 ? (
          <button
            onClick={() => hasSubtasks && setExpanded(e => !e)}
            className={cn(
              'mt-0.5 w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center text-subtle transition-transform duration-150',
              hasSubtasks ? 'hover:text-muted cursor-pointer' : 'opacity-0',
              expanded && 'rotate-90'
            )}
          >
            {hasSubtasks && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        ) : (
          <span className="w-3.5" />
        )}

        {/* Checkbox */}
        <button
          onClick={toggleComplete}
          className={cn(
            'mt-0.5 w-4 h-4 flex-shrink-0 rounded border transition-colors duration-100',
            task.completed
              ? 'bg-accent border-accent'
              : 'border-border-focus hover:border-accent'
          )}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && (
            <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Priority dot */}
        <span
          className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', PRIORITY_DOT[task.priority])}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm leading-snug', task.completed && 'line-through text-muted')}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.dueDate && (
              <span className={cn('text-xs', overdueDate ? 'text-red-400' : 'text-muted')}>
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.project && depth === 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: task.project.color + '22', color: task.project.color }}
              >
                {task.project.title}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex-shrink-0">
          <button
            onClick={openEdit}
            className="p-1 text-subtle hover:text-muted rounded"
            title="Edit task"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110.414 16H9v-1.414A2 2 0 019.586 13z" />
            </svg>
          </button>
          {depth === 0 && (
            <button
              onClick={() => setAdding(a => !a)}
              className="p-1 text-subtle hover:text-muted rounded"
              title="Add subtask"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={deleteTask}
            className="p-1 text-subtle hover:text-red-400 rounded"
            title="Delete task"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div className="animate-fade-in">
          {task.subtasks.map(sub => (
            <TaskItem key={sub.id} task={sub} depth={depth + 1} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      {/* Add subtask form */}
      {adding && (
        <form
          onSubmit={addSubtask}
          className="ml-6 pl-4 border-l border-border mt-1 flex items-center gap-2 animate-fade-in"
        >
          <input
            className="input text-sm py-1.5 flex-1"
            placeholder="Add subtask…"
            value={subtaskTitle}
            onChange={e => setSubtaskTitle(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary text-xs py-1.5 px-3" disabled={submitting || !subtaskTitle.trim()}>
            Add
          </button>
          <button type="button" className="btn-ghost text-xs py-1.5" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      )}

      {/* Edit form */}
      {editing && (
        <form
          onSubmit={saveEdit}
          className="mt-1 mx-2 p-3 rounded-lg bg-surface-2 border border-border animate-fade-in flex flex-col gap-3"
        >
          {/* Title */}
          <input
            className="input text-sm py-1.5 w-full"
            placeholder="Task title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            autoFocus
            required
          />

          <div className="flex flex-wrap gap-2">
            {/* Priority */}
            <div className="flex flex-col gap-1 flex-1 min-w-[110px]">
              <label className="text-xs text-muted">Priority</label>
              <select
                className="input text-sm py-1.5"
                value={editPriority}
                onChange={e => setEditPriority(e.target.value as TaskType['priority'])}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
              <label className="text-xs text-muted">Due date</label>
              <input
                type="date"
                className="input text-sm py-1.5"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
              />
            </div>

            {/* Project */}
            {depth === 0 && (
              <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
                <label className="text-xs text-muted">Project</label>
                <select
                  className="input text-sm py-1.5"
                  value={editProjectId}
                  onChange={e => setEditProjectId(e.target.value)}
                >
                  <option value="">No project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              className="btn-ghost text-xs py-1.5 px-3"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs py-1.5 px-3"
              disabled={editSaving || !editTitle.trim()}
            >
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
