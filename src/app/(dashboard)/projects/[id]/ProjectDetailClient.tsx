'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TaskType } from '@/components/TaskItem'
import { SortableTaskItem } from '@/components/SortableTaskItem'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

export interface Project {
  id: string
  title: string
  description?: string | null
  color: string
  tasks: TaskType[]
}

export function ProjectDetailClient({ project }: { project: Project }) {
  const router = useRouter()
  const [tasks, setTasks] = useState(project.tasks)
  const [newTitle, setNewTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pending = tasks.filter(t => !t.completed)
  const done = tasks.filter(t => t.completed)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function handleTaskDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pending.findIndex(t => t.id === active.id)
    const newIndex = pending.findIndex(t => t.id === over.id)
    const newPending = arrayMove(pending, oldIndex, newIndex)
    setTasks([...newPending, ...done])

    await Promise.all(
      newPending.map((task, index) =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: index }),
        })
      )
    )
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSubmitting(true)

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), projectId: project.id }),
    })

    setNewTitle('')
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <Link href="/projects" className="text-sm text-muted hover:text-white transition-colors mb-4 inline-flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Projects
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8 mt-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: project.color + '33' }}
        >
          <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: project.color }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">{project.title}</h1>
          {project.description && (
            <p className="text-muted mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      {/* Add task */}
      <form onSubmit={addTask} className="flex gap-2 mb-6">
        <input
          className="input flex-1"
          placeholder="Add a task to this project…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary flex-shrink-0"
          disabled={!newTitle.trim() || submitting}
        >
          Add
        </button>
      </form>

      {/* Tasks */}
      {project.tasks.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p>No tasks yet — add one above</p>
        </div>
      ) : (
        <div className="space-y-0.5 pl-5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
            <SortableContext items={pending.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {pending.map(task => (
                <SortableTaskItem key={task.id} task={task} onUpdate={() => router.refresh()} />
              ))}
            </SortableContext>
          </DndContext>

          {done.length > 0 && (
            <div className="pt-4">
              <p className="text-xs text-subtle uppercase tracking-wider px-2 mb-2">
                Completed ({done.length})
              </p>
              {done.map(task => (
                <SortableTaskItem key={task.id} task={task} onUpdate={() => router.refresh()} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
