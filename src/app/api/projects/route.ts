import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETE']).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { tasks: { where: { completed: false, parentId: null } } } },
    },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const last = await prisma.project.findFirst({
    where: { userId: session.user.id },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const project = await prisma.project.create({
    data: {
      ...result.data,
      order: (last?.order ?? -1) + 1,
      userId: session.user.id,
    },
    include: { _count: { select: { tasks: { where: { completed: false, parentId: null } } } } },
  })

  return NextResponse.json(project, { status: 201 })
}
