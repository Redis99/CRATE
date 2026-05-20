import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateFleetER } from '@/lib/game-math'
import { computeCodexBonuses } from '@/lib/codex'

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id:            true,
      username:      true,
      createdAt:     true,
      avatarUrl:     true,
      bio:           true,
      equippedTitle: true,
      profilePublic: true,
      balanceCrate:  true,
      balanceSol:    true,
      balanceLc:     true,
      totalMinigameWins: true,
      titles: {
        select: { id: true, title: true, source: true, earnedAt: true },
        orderBy: { earnedAt: 'desc' },
      },
    },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const [miningTotal, robotCount, missionCount, codexCount, activeRobots, appliedUpgrades, codexCollections, codexEntries] =
    await Promise.all([
      prisma.miningReward.aggregate({
        where: { userId: user.id, token: 'CRATE' },
        _sum: { amount: true },
      }),
      prisma.robot.count({ where: { userId: user.id, inCodex: false } }),
      prisma.userMission.count({ where: { userId: user.id, completed: true } }),
      prisma.codexEntry.count({ where: { userId: user.id } }),
      prisma.robot.findMany({
        where: { userId: user.id, isActive: true, inCodex: false },
        select: {
          hashPower: true, durability: true, maxDurability: true,
          equipments: {
            select: {
              equipment: {
                select: { effectType: true, effectValue: true, effectType2: true, effectValue2: true },
              },
            },
          },
        },
      }),
      prisma.baseUpgrade.findMany({
        where: { userId: user.id, isApplied: true },
        select: { effectType: true, effectValue: true, effectType2: true, effectValue2: true },
      }),
      prisma.codexCollection.findMany({ where: { active: true } }),
      prisma.codexEntry.findMany({ where: { userId: user.id } }),
    ])

  const { erPct } = computeCodexBonuses(codexCollections, codexEntries)
  const mappedRobots = activeRobots.map((r) => ({
    ...r,
    maxDurability: r.maxDurability ?? undefined,
    equipments: r.equipments.map((e) => e.equipment),
  }))
  const fleetER = calculateFleetER(mappedRobots, appliedUpgrades, 0, erPct)

  return NextResponse.json({
    profile,
    stats: {
      crateMinedTotal:   miningTotal._sum.amount ?? 0,
      robotCount,
      currentFleetER:    fleetER.total,
      minigameWins:      profile.totalMinigameWins,
      missionsCompleted: missionCount,
      codexEntries:      codexCount,
      memberSince:       profile.createdAt,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, unknown>
  const { bio, avatarUrl, equippedTitle, profilePublic } = body

  if (bio !== undefined && bio !== null && typeof bio === 'string' && bio.length > 200) {
    return NextResponse.json({ error: 'Bio must be 200 characters or less' }, { status: 400 })
  }

  if (equippedTitle !== undefined && equippedTitle !== null && equippedTitle !== '') {
    const owned = await prisma.userTitle.findUnique({
      where: { userId_title: { userId: user.id, title: equippedTitle as string } },
    })
    if (!owned) return NextResponse.json({ error: 'Title not owned' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (bio           !== undefined) updates.bio           = (bio           as string) || null
  if (avatarUrl     !== undefined) updates.avatarUrl     = (avatarUrl     as string) || null
  if (equippedTitle !== undefined) updates.equippedTitle = (equippedTitle as string) || null
  if (profilePublic !== undefined) updates.profilePublic = Boolean(profilePublic)

  const updated = await prisma.user.update({
    where: { id: user.id },
    data:  updates,
    select: { bio: true, avatarUrl: true, equippedTitle: true, profilePublic: true },
  })

  return NextResponse.json({ success: true, profile: updated })
}
