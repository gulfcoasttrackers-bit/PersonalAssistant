import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatUtcTimestamp(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function formatDateValue(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = req.nextUrl.searchParams.get('start')
  const end = req.nextUrl.searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end are required' }, { status: 400 })
  }

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const userId = session.user.id
  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: startDate, lte: endDate },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.task.findMany({
      where: {
        userId,
        dueDate: { gte: startDate, lte: endDate },
        parentId: null,
        completed: false,
      },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const nowStamp = formatUtcTimestamp(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Personal Assistant//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  events.forEach((event) => {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:event-${event.id}@personal-assistant.local`)
    lines.push(`DTSTAMP:${nowStamp}`)

    if (event.allDay) {
      const nextDay = new Date(event.endTime)
      const sameDate = formatDateValue(event.startTime) === formatDateValue(event.endTime)
      if (sameDate || nextDay.getUTCHours() === 23) {
        nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      }
      lines.push(`DTSTART;VALUE=DATE:${formatDateValue(event.startTime)}`)
      lines.push(`DTEND;VALUE=DATE:${formatDateValue(nextDay)}`)
    } else {
      lines.push(`DTSTART:${formatUtcTimestamp(event.startTime)}`)
      lines.push(`DTEND:${formatUtcTimestamp(event.endTime)}`)
    }

    lines.push(`SUMMARY:${escapeIcsText(event.title)}`)
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`)
    }
    lines.push('END:VEVENT')
  })

  tasks.forEach((task) => {
    if (!task.dueDate) return
    const startOfDay = new Date(task.dueDate)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:task-${task.id}@personal-assistant.local`)
    lines.push(`DTSTAMP:${nowStamp}`)
    lines.push(`DTSTART;VALUE=DATE:${formatDateValue(startOfDay)}`)
    lines.push(`DTEND;VALUE=DATE:${formatDateValue(endOfDay)}`)
    lines.push(`SUMMARY:${escapeIcsText(`Task due: ${task.title}`)}`)
    lines.push(`DESCRIPTION:${escapeIcsText(`Priority: ${task.priority}\nStatus: open`)}`)
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  const filename = `personal-assistant-calendar-${startDate.getUTCFullYear()}-${String(startDate.getUTCMonth() + 1).padStart(2, '0')}.ics`

  return new NextResponse(`${lines.join('\r\n')}\r\n`, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}