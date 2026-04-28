'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskItem, TaskType } from './TaskItem'

interface Props {
  task: TaskType
  onUpdate?: () => void
}

export function SortableTaskItem({ task, onUpdate }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/sortable ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      {/* Drag handle — appears on hover to the left of the task row */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-y-0 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity text-subtle hover:text-muted touch-none"
        style={{ left: '-18px', width: '16px' }}
        title="Drag to reorder"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>

      <TaskItem task={task} onUpdate={onUpdate} />
    </div>
  )
}
