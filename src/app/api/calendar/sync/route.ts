import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  status?: string
  start?: {
    dateTime?: string
    date?: string
  }
  end?: {
    dateTime?: string
    date?: string
  }
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[]
}

const TOKEN_REFRESH_TIMEOUT_MS = 15000
const GCAL_FETCH_TIMEOUT_MS = 20000

function toErrorDetail(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unknown error'
}

async function parseJsonBodySafe(res: Response): Promise<unknown | null> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string
  expires_at: number
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(TOKEN_REFRESH_TIMEOUT_MS),
    })

    if (!res.ok) return null
    const data = await res.json()
    if (!data.access_token || !data.expires_in) return null

    return {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const trigger = searchParams.get('trigger') === 'auto' ? 'auto' : 'manual'

  async function logSync(data: {
    status: string
    synced?: number
    skipped?: number
    conflicts?: number
    total?: number
    detail?: string
  }) {
    try {
      await prisma.calendarSyncLog.create({
        data: {
          userId,
          trigger,
          status: data.status,
          synced: data.synced ?? 0,
          skipped: data.skipped ?? 0,
          conflicts: data.conflicts ?? 0,
          total: data.total ?? 0,
          detail: data.detail,
        },
      })
    } catch {
      // Logging failures should not block sync response handling.
    }
  }

  try {
    // Find Google account
    const googleAccount = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
    })

    if (!googleAccount || !googleAccount.access_token) {
      await logSync({ status: 'needs_google', detail: 'Google account not connected' })
      return NextResponse.json({ needsGoogle: true }, { status: 200 })
    }

    let accessToken = googleAccount.access_token

    // Refresh if expired (expires_at is Unix seconds)
    if (googleAccount.expires_at && googleAccount.expires_at < Math.floor(Date.now() / 1000) + 60) {
      if (!googleAccount.refresh_token) {
        await logSync({ status: 'needs_google', detail: 'Missing refresh token' })
        return NextResponse.json({ needsGoogle: true }, { status: 200 })
      }
      const refreshed = await refreshGoogleToken(googleAccount.refresh_token)
      if (!refreshed) {
        await logSync({ status: 'needs_google', detail: 'Refresh token is invalid, expired, or timed out' })
        return NextResponse.json({ needsGoogle: true }, { status: 200 })
      }
      await prisma.account.update({
        where: { id: googleAccount.id },
        data: { access_token: refreshed.access_token, expires_at: refreshed.expires_at },
      })
      accessToken = refreshed.access_token
    }

    // Fetch events from Google Calendar (90 days back to 180 days forward)
    const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()

    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '500',
        }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(GCAL_FETCH_TIMEOUT_MS),
      }
    )

    if (!gcalRes.ok) {
      const errBody = await parseJsonBodySafe(gcalRes)
      const errText = typeof errBody === 'object' && errBody !== null
        ? JSON.stringify(errBody)
        : `HTTP ${gcalRes.status}`

      await logSync({ status: 'error', detail: `Google API error: ${errText.slice(0, 700)}` })
      return NextResponse.json({ error: 'Google API error' }, { status: 502 })
    }

    const gcalBody = await parseJsonBodySafe(gcalRes)
    const gcalData = (gcalBody ?? {}) as GoogleCalendarResponse
    const items = Array.isArray(gcalData.items) ? gcalData.items : []

    let synced = 0
    let skipped = 0
    let conflicts = 0

    for (const item of items) {
    // Skip cancelled events
      if (item.status === 'cancelled') continue

      const isAllDay = !!item.start?.date && !item.start?.dateTime
      const startRaw = item.start?.dateTime ?? item.start?.date
      const endRaw = item.end?.dateTime ?? item.end?.date

      if (!startRaw || !endRaw) { skipped++; continue }

    // For all-day events, date string e.g. "2026-05-10" → set to noon UTC to avoid TZ issues
      const startTime = isAllDay
        ? new Date(startRaw + 'T12:00:00Z')
        : new Date(startRaw)
      const endTime = isAllDay
        ? new Date(endRaw + 'T12:00:00Z')
        : new Date(endRaw)

      const existing = await prisma.event.findUnique({
        where: { googleEventId: item.id },
        select: { id: true, userId: true, localEdits: true },
      })

      if (existing && existing.userId !== session.user.id) {
        skipped++
        continue
      }

      if (existing && existing.userId === session.user.id && existing.localEdits) {
        await prisma.event.update({
          where: { id: existing.id },
          data: { lastGoogleSyncAt: new Date() },
        })
        conflicts++
        skipped++
        continue
      }

      await prisma.event.upsert({
        where: { googleEventId: item.id },
        update: {
          title: item.summary ?? '(No title)',
          description: item.description ?? null,
          startTime,
          endTime,
          allDay: isAllDay,
          source: 'GOOGLE',
          localEdits: false,
          lastGoogleSyncAt: new Date(),
        },
        create: {
          title: item.summary ?? '(No title)',
          description: item.description ?? null,
          startTime,
          endTime,
          allDay: isAllDay,
          source: 'GOOGLE',
          localEdits: false,
          lastGoogleSyncAt: new Date(),
          googleEventId: item.id,
          userId,
        },
      })
      synced++
    }

    await logSync({
      status: 'success',
      synced,
      skipped,
      conflicts,
      total: items.length,
      detail: conflicts > 0 ? 'Preserved local edits on conflicting Google events' : undefined,
    })

    return NextResponse.json({ synced, skipped, conflicts, total: items.length, trigger })
  } catch (error) {
    const detail = toErrorDetail(error)
    const isTimeout = detail.toLowerCase().includes('timeout') || detail === 'The operation was aborted'
    await logSync({ status: 'error', detail: `Sync request failed: ${detail.slice(0, 700)}` })
    return NextResponse.json(
      { error: isTimeout ? 'Google sync timed out' : 'Google sync failed' },
      { status: isTimeout ? 504 : 500 }
    )
  }
}
