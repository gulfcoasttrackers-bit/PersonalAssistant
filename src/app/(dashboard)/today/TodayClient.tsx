'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

interface Props {
  tasks: TaskType[]
  greeting: string
}

export function TodayClient({ tasks: initial, greeting }: Props) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initial)
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

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), dueDate: today.toISOString() }),
    })

    setNewTitle('')
    setSubmitting(false)
    router.refresh()
  }

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-muted text-sm mb-1">{dateLabel}</p>
        <h1 className="text-2xl font-semibold text-white">{greeting}</h1>
        {pending.length > 0 && (
          <p className="text-muted mt-1">
            You have <span className="text-white">{pending.length}</span> task{pending.length !== 1 ? 's' : ''} today
          </p>
        )}
      </div>

      {/* Add task */}
      <form onSubmit={addTask} className="flex gap-2 mb-6">
        <input
          className="input flex-1"
          placeholder="Add a task for today…"
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

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p>All clear — enjoy your day!</p>
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
