'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Project {
  id: string
  title: string
  description?: string | null
  color: string
  _count: { tasks: number }
}

function SortableProjectCard({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/proj ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 cursor-grab active:cursor-grabbing opacity-0 group-hover/proj:opacity-100 transition-opacity text-subtle hover:text-muted z-10 touch-none"
        title="Drag to reorder"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>
      <Link
        href={`/projects/${project.id}`}
        className="card p-4 hover:bg-surface-2 transition-colors duration-100 group block"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 mt-0.5"
            style={{ backgroundColor: project.color + '33' }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
            </div>
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <p className="font-medium text-white group-hover:text-accent transition-colors truncate">
              {project.title}
            </p>
            {project.description && (
              <p className="text-sm text-muted mt-0.5 truncate">{project.description}</p>
            )}
            <p className="text-xs text-subtle mt-1.5">
              {project._count.tasks} open task{project._count.tasks !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}



const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
]

export function ProjectsClient({ projects: initial }: { projects: Project[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initial)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [submitting, setSubmitting] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function handleProjectDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = projects.findIndex(p => p.id === active.id)
    const newIndex = projects.findIndex(p => p.id === over.id)
    const newProjects = arrayMove(projects, oldIndex, newIndex)
    setProjects(newProjects)

    await Promise.all(
      newProjects.map((project, index) =>
        fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: index }),
        })
      )
    )
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, color }),
    })

    if (res.ok) {
      const newProject = await res.json()
      setProjects(prev => [...prev, newProject])
      setTitle('')
      setDescription('')
      setColor('#6366f1')
      setCreating(false)
      router.refresh()
    }
    setSubmitting(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <p className="text-muted mt-1">Organize tasks into ongoing projects</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          New project
        </button>
      </div>

      {/* Create project form */}
      {creating && (
        <div className="card p-4 mb-6 animate-slide-up">
          <form onSubmit={createProject} className="space-y-3">
            <input
              className="input"
              placeholder="Project name"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              required
            />
            <input
              className="input"
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div>
              <p className="text-xs text-muted mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full transition-transform duration-100 hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!title.trim() || submitting}>
                {submitting ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects grid */}
      {projects.length === 0 && !creating ? (
        <div className="text-center py-16 text-muted">
          <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <p>No projects yet</p>
          <button className="btn-primary mt-3" onClick={() => setCreating(true)}>
            Create your first project
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map(p => (
                <SortableProjectCard key={p.id} project={p} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
