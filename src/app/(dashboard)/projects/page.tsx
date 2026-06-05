import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProjectsClient } from './ProjectsClient'
import type { Project } from './ProjectsClient'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { tasks: { where: { completed: false, parentId: null } } } },
    },
    orderBy: { order: 'asc' },
  })

  return <ProjectsClient projects={projects as unknown as Project[]} />
}
