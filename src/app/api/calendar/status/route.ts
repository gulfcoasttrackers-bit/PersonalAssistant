import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  const googleAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'google' },
    select: { id: true, access_token: true },
  })

  const googleEventsCount = await prisma.event.count({
    where: { userId: session.user.id, NOT: { googleEventId: null } },
  })

  const latestGoogleEvent = await prisma.event.findFirst({
    where: { userId: session.user.id, NOT: { googleEventId: null } },
    select: { updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const syncHistory = await prisma.calendarSyncLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true,
      trigger: true,
      status: true,
      synced: true,
      skipped: true,
      conflicts: true,
      total: true,
      detail: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    googleConfigured,
    connected: !!googleAccount?.access_token,
    googleEventsCount,
    lastSyncedAt: latestGoogleEvent?.updatedAt ?? null,
    syncHistory,
  })
}