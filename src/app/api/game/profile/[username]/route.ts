import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateFleetER } from '@/lib/game-math'
import { computeCodexBonuses } from '@/lib/codex'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params

  const profile = await prisma.user.findUnique({
    where: { username },
    select: {
      id:            true,
      username:      true,
      createdAt:     true,
      avatarUrl:     true,
      bio:           true,
      equippedTitle: true,
      profilePublic: true,
      totalMinigameWins: true,
    },
  })

  if (!profile) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (!profile.profilePublic) {
    return NextResponse.json({ private: true, username: profile.username })
  }

  const [miningTotal, robotCount, missionCount, codexCount, activeRobots, appliedUpgrades, codexCollections, codexEntries] =
    await Promise.all([
      prisma.miningReward.aggregate({
        where: { userId: profile.id, token: 'CRATE' },
        _sum: { amount: true },
      }),
      prisma.robot.count({ where: { userId: profile.id, inCodex: false } }),
      prisma.userMission.count({ where: { userId: profile.id, completed: true } }),
      prisma.codexEntry.count({ where: { userId: profile.id } }),
      prisma.robot.findMany({
        where: { userId: profile.id, isActive: true, inCodex: false },
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
        where: { userId: profile.id, isApplied: true },
        select: { effectType: true, effectValue: true, effectType2: true, effectValue2: true },
      }),
      prisma.codexCollection.findMany({ where: { active: true } }),
      prisma.codexEntry.findMany({ where: { userId: profile.id } }),
    ])

  const { erPct } = computeCodexBonuses(codexCollections, codexEntries)
  const mappedRobots = activeRobots.map((r) => ({
    ...r,
    maxDurability: r.maxDurability ?? undefined,
    equipments: r.equipments.map((e) => e.equipment),
  }))
  const fleetER = calculateFleetER(mappedRobots, appliedUpgrades, 0, erPct)

  return NextResponse.json({
    profile: {
      username:      profile.username,
      avatarUrl:     profile.avatarUrl,
      bio:           profile.bio,
      equippedTitle: profile.equippedTitle,
      memberSince:   profile.createdAt,
    },
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
