import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
  order: z.number().int().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const dueToday = searchParams.get('dueToday') === 'true'
  const completed = searchParams.get('completed')
  const parentId = searchParams.get('parentId')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      ...(projectId ? { projectId } : {}),
      ...(dueToday ? { dueDate: { gte: today, lt: tomorrow } } : {}),
      ...(completed !== null ? { completed: completed === 'true' } : {}),
      ...(parentId !== null ? { parentId: parentId || null } : {}),
    },
    include: {
      subtasks: { orderBy: { order: 'asc' } },
      project: { select: { id: true, title: true, color: true } },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { title, description, priority, dueDate, projectId, parentId, order } = result.data

  // Find highest order if not specified
  let taskOrder = order
  if (taskOrder === undefined) {
    const last = await prisma.task.findFirst({
      where: { userId: session.user.id, projectId: projectId ?? null, parentId: parentId ?? null },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    taskOrder = (last?.order ?? -1) + 1
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      priority: priority ?? 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: projectId ?? null,
      parentId: parentId ?? null,
      order: taskOrder,
      userId: session.user.id,
    },
    include: {
      subtasks: true,
      project: { select: { id: true, title: true, color: true } },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
