import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface ParsedIcsEvent {
  uid: string
  title: string
  description: string | null
  startTime: Date
  endTime: Date
  allDay: boolean
}

function unfoldIcsLines(text: string) {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []

  rawLines.forEach((line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
      return
    }
    lines.push(line)
  })

  return lines
}

function unescapeIcsText(value: string) {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

function parseIcsDate(value: string, allDay: boolean) {
  if (allDay) {
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(4, 6)) - 1
    const day = Number(value.slice(6, 8))
    return new Date(Date.UTC(year, month, day, 0, 0, 0))
  }

  if (value.endsWith('Z')) {
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(4, 6)) - 1
    const day = Number(value.slice(6, 8))
    const hours = Number(value.slice(9, 11))
    const minutes = Number(value.slice(11, 13))
    const seconds = Number(value.slice(13, 15) || '0')
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds))
  }

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6)) - 1
  const day = Number(value.slice(6, 8))
  const hours = Number(value.slice(9, 11) || '0')
  const minutes = Number(value.slice(11, 13) || '0')
  const seconds = Number(value.slice(13, 15) || '0')
  return new Date(year, month, day, hours, minutes, seconds)
}

function parseIcsEvents(text: string): ParsedIcsEvent[] {
  const lines = unfoldIcsLines(text)
  const events: ParsedIcsEvent[] = []
  let current: Record<string, { value: string; params: string[] }> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }

    if (line === 'END:VEVENT') {
      if (current?.UID?.value && current?.SUMMARY?.value && current?.DTSTART?.value) {
        const startAllDay = current.DTSTART.params.includes('VALUE=DATE')
        const endAllDay = current.DTEND?.params.includes('VALUE=DATE') ?? startAllDay
        const startTime = parseIcsDate(current.DTSTART.value, startAllDay)
        const endTime = current.DTEND?.value
          ? parseIcsDate(current.DTEND.value, endAllDay)
          : (() => {
              const fallback = new Date(startTime)
              fallback.setUTCDate(fallback.getUTCDate() + 1)
              return fallback
            })()

        events.push({
          uid: current.UID.value,
          title: unescapeIcsText(current.SUMMARY.value),
          description: current.DESCRIPTION?.value ? unescapeIcsText(current.DESCRIPTION.value) : null,
          startTime,
          endTime,
          allDay: startAllDay,
        })
      }
      current = null
      continue
    }

    if (!current) continue

    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const namePart = line.slice(0, colonIndex)
    const value = line.slice(colonIndex + 1)
    const [name, ...params] = namePart.split(';')
    current[name.toUpperCase()] = { value, params: params.map((p) => p.toUpperCase()) }
  }

  return events
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No ICS file received' }, { status: 400 })
  }

  const text = await file.text()
  const parsedEvents = parseIcsEvents(text)
  if (parsedEvents.length === 0) {
    return NextResponse.json({ error: 'No calendar events found in ICS file' }, { status: 400 })
  }

  const userId = session.user.id
  let imported = 0
  let updated = 0
  let skipped = 0
  let replaced = 0
  const replacementAudit: Array<{
    uid: string
    eventId: string
    replacedAt: string
    previous: {
      title: string
      description: string | null
      startTime: string
      endTime: string
      allDay: boolean
      source: string
      localEdits: boolean
      lastLocalEditAt: string | null
      lastGoogleSyncAt: string | null
    }
    incoming: {
      title: string
      description: string | null
      startTime: string
      endTime: string
      allDay: boolean
      source: 'IMPORTED'
    }
  }> = []

  for (const item of parsedEvents) {
    const existing = await prisma.event.findUnique({
      where: { externalImportUid: item.uid },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        allDay: true,
        source: true,
        localEdits: true,
        lastLocalEditAt: true,
        lastGoogleSyncAt: true,
      },
    })

    if (existing && existing.userId !== userId) {
      skipped++
      continue
    }

    if (existing) {
      replacementAudit.push({
        uid: item.uid,
        eventId: existing.id,
        replacedAt: new Date().toISOString(),
        previous: {
          title: existing.title,
          description: existing.description,
          startTime: existing.startTime.toISOString(),
          endTime: existing.endTime.toISOString(),
          allDay: existing.allDay,
          source: existing.source,
          localEdits: existing.localEdits,
          lastLocalEditAt: existing.lastLocalEditAt ? existing.lastLocalEditAt.toISOString() : null,
          lastGoogleSyncAt: existing.lastGoogleSyncAt ? existing.lastGoogleSyncAt.toISOString() : null,
        },
        incoming: {
          title: item.title,
          description: item.description,
          startTime: item.startTime.toISOString(),
          endTime: item.endTime.toISOString(),
          allDay: item.allDay,
          source: 'IMPORTED',
        },
      })

      await prisma.event.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          description: item.description,
          startTime: item.startTime,
          endTime: item.endTime,
          allDay: item.allDay,
          source: 'IMPORTED',
          localEdits: false,
          lastLocalEditAt: null,
        },
      })
      updated++
      if (existing.localEdits) {
        replaced++
      }
      continue
    }

    await prisma.event.create({
      data: {
        title: item.title,
        description: item.description,
        startTime: item.startTime,
        endTime: item.endTime,
        allDay: item.allDay,
        source: 'IMPORTED',
        externalImportUid: item.uid,
        userId,
      },
    })
    imported++
  }

  if (replacementAudit.length > 0) {
    try {
      const MAX_AUDIT_ENTRIES = 100
      const truncated = replacementAudit.length > MAX_AUDIT_ENTRIES
      const auditEntries = replacementAudit.slice(0, MAX_AUDIT_ENTRIES)
      const detailPayload = {
        policy: 'replace_existing_with_latest',
        totalReplacements: replacementAudit.length,
        truncated,
        omitted: truncated ? replacementAudit.length - MAX_AUDIT_ENTRIES : 0,
        entries: auditEntries,
      }

      await prisma.calendarSyncLog.create({
        data: {
          userId,
          trigger: 'import',
          status: 'replacement_audit',
          synced: updated,
          skipped,
          conflicts: 0,
          total: parsedEvents.length,
          detail: JSON.stringify(detailPayload),
        },
      })
    } catch {
      // Audit logging must not block successful import.
    }
  }

  return NextResponse.json({
    imported,
    updated,
    skipped,
    replaced,
    conflicts: 0,
    total: parsedEvents.length,
  })
}