import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProjectDetailClient } from './ProjectDetailClient'
import type { Project } from './ProjectDetailClient'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      tasks: {
        where: { parentId: null },
        include: { subtasks: { orderBy: { order: 'asc' } } },
        orderBy: [{ completed: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
      },
    },
  })

  if (!project) notFound()
  return <ProjectDetailClient project={project as unknown as Project} />
}
