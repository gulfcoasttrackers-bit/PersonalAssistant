import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TodayClient } from './TodayClient'

export default async function TodayPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Tasks due today + inbox tasks (no due date, no project) + overdue
  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      parentId: null,
      OR: [
        { dueDate: { gte: today, lt: tomorrow } },
        { dueDate: { lt: today }, completed: false },
        { dueDate: null, projectId: null, completed: false },
      ],
    },
    include: {
      subtasks: { orderBy: { order: 'asc' } },
      project: { select: { id: true, title: true, color: true } },
    },
    orderBy: [{ completed: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
  })

  const greeting = getGreeting(session.user.name)

  return <TodayClient tasks={tasks as any} greeting={greeting} />
}

function getGreeting(name?: string | null) {
  const hour = new Date().getHours()
  const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${timeGreet}, ${name.split(' ')[0]}` : timeGreet
}
