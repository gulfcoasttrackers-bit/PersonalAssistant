import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const updateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
})

async function getEventForUser(id: string, userId: string) {
  return prisma.event.findFirst({ where: { id, userId } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const event = await getEventForUser(id, session.user.id)
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...result.data,
      ...(result.data.startTime ? { startTime: new Date(result.data.startTime) } : {}),
      ...(result.data.endTime ? { endTime: new Date(result.data.endTime) } : {}),
      ...(event.googleEventId
        ? {
            localEdits: true,
            lastLocalEditAt: new Date(),
          }
        : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const event = await getEventForUser(id, session.user.id)
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.event.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
