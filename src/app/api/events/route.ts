import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const events = await prisma.event.findMany({
    where: {
      userId: session.user.id,
      ...(start && end
        ? { startTime: { gte: new Date(start), lte: new Date(end) } }
        : {}),
    },
    orderBy: { startTime: 'asc' },
  })

  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const event = await prisma.event.create({
    data: {
      ...result.data,
      startTime: new Date(result.data.startTime),
      endTime: new Date(result.data.endTime),
      source: 'LOCAL',
      localEdits: false,
      userId: session.user.id,
    },
  })

  return NextResponse.json(event, { status: 201 })
}
