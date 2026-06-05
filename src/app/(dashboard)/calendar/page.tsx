import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CalendarClient } from './CalendarClient'

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)

  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: {
        userId: session.user.id,
        startTime: { gte: start, lte: end },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.task.findMany({
      where: {
        userId: session.user.id,
        dueDate: { gte: start, lte: end },
        parentId: null,
      },
      select: { id: true, title: true, dueDate: true, completed: true, priority: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const serializedEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    allDay: event.allDay,
    description: event.description,
  }))

  const serializedTasks = tasks
    .filter(task => !!task.dueDate)
    .map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate!.toISOString(),
      completed: task.completed,
      priority: task.priority,
    }))

  return <CalendarClient events={serializedEvents} tasks={serializedTasks} />
}
