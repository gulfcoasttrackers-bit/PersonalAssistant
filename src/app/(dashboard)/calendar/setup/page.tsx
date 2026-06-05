import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GoogleCalendarSetup } from './GoogleCalendarSetup'

export default async function GoogleCalendarSetupPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const googleAccount = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'google' },
    select: { id: true, access_token: true },
  })

  return <GoogleCalendarSetup isConnected={!!googleAccount?.access_token} />
}
