import 'server-only'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getAdminUser() {
  const user = await getServerUser()
  if (!user) return null
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, isAdmin: true },
  })
  if (!profile?.isAdmin) return null
  return { id: user.id, username: profile.username }
}
