import { getServerUser } from '@/lib/auth'
import { calculateFleetER, calculateFleetPD } from '@/lib/game-math'
import { computeCodexBonuses } from '@/lib/codex'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BalanceDropdown } from '@/components/game/BalanceDropdown'
import { ERWidget, PDWidget } from '@/components/game/FleetStatsWidget'
import { MiningRewardsCard } from '@/components/game/MiningRewardsCard'
import { RobotCard } from '@/components/game/RobotCard'
import { RechargeAllButton } from '@/components/game/RechargeAllButton'
import { EquipmentCard, EmptyEquipmentSlot } from '@/components/game/EquipmentCard'
import { BASE_SLOT_LABELS } from '@/lib/game-constants'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Inside the Crate',
}

async function getDashboardData() {
  const user = await getServerUser()
  if (!user) return null

  const [profile, allActiveRobots, lastBlock, totalMined, allNetworkUpgrades, baseUpgrades, robotsNeedingRepair, minigameBoost, allMinigameBoosts, codexCollections, allCodexEntries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        balanceCrate: true,
        balanceSol: true,
        balanceLc: true,
        outpostSlots: true,
        allocationCrate: true,
        allocationSol: true,
        allocationLc: true,
        robots: {
          where: { isActive: true },
          select: {
            id: true, name: true, collection: true,
            hashPower: true, energyRate: true, durability: true, maxDurability: true,
            rarity: true, outpostSlot: true, isActive: true,
            equipments: {
              select: {
                equipmentId: true,
                equipment: {
                  select: {
                    id: true, name: true, rarity: true,
                    effectType: true, effectValue: true,
                    effectType2: true, effectValue2: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            robots: true,
            miningRewards: true,
          },
        },
      },
    }),
    // ER total da rede — inclui equipamentos e base upgrades de todos os jogadores
    prisma.robot.findMany({
      where: { isActive: true },
      select: {
        userId: true,
        hashPower: true,
        durability: true,
        maxDurability: true,
        rarity: true,
        equipments: {
          select: {
            equipment: {
              select: {
                effectType: true, effectValue: true,
                effectType2: true, effectValue2: true,
              },
            },
          },
        },
      },
    }),
    // Último bloco processado
    prisma.miningBlock.findFirst({
      orderBy: { processedAt: 'desc' },
    }),
    // Total de CRATE minerado pelo jogador
    prisma.miningReward.aggregate({
      where: { userId: user.id, token: 'CRATE' },
      _sum: { amount: true },
    }),
    // Base upgrades aplicados de todos os jogadores (filtramos por usuário ativo no cálculo)
    prisma.baseUpgrade.findMany({
      where: { isApplied: true },
      select: {
        userId: true,
        effectType: true, effectValue: true,
        effectType2: true, effectValue2: true,
      },
    }),
    // Base upgrades do próprio jogador (para ERWidget e userShareER)
    prisma.baseUpgrade.findMany({
      where: { userId: user.id, isApplied: true },
      select: {
        id: true, name: true, rarity: true,
        effectType: true, effectValue: true,
        effectType2: true, effectValue2: true,
        appliedSlot: true,
      },
    }),
    // Robôs com energia baixa — busca todos e filtra por % do lado do servidor
    prisma.robot.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, durability: true, maxDurability: true, isActive: true },
    }),
    // Soma de ER boost ativo do próprio jogador (N entradas independentes)
    prisma.minigameBoost.aggregate({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      _sum:  { erFlat: true },
    }),
    // ER boost ativo por userId (para networkER — groupBy soma entradas ativas)
    prisma.minigameBoost.groupBy({
      by:    ['userId'],
      where: { expiresAt: { gt: new Date() } },
      _sum:  { erFlat: true },
    }),
    // Coleções do Codex (para bônus de ER/PD)
    prisma.codexCollection.findMany({ where: { active: true } }),
    // Entradas do Codex de todos os jogadores (para bônus no networkER)
    prisma.codexEntry.findMany({ select: { userId: true, collection: true } }),
  ])

  return { profile, allActiveRobots, lastBlock, totalMined, allNetworkUpgrades, baseUpgrades, robotsNeedingRepair, minigameBoost, allMinigameBoosts, codexCollections, allCodexEntries }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data?.profile) {
    return <div className="p-8 text-gray-400">Loading profile...</div>
  }

  const { profile, allActiveRobots, lastBlock, totalMined, allNetworkUpgrades, baseUpgrades, minigameBoost, allMinigameBoosts, codexCollections, allCodexEntries } = data
  const activeRobots = profile.robots

  // Filtra robôs com energia < 50% (baseado no maxDurability individual do banco)
  const robotsNeedingRepair = data.robotsNeedingRepair
    .filter((r) => {
      const max = r.maxDurability ?? r.durability
      return max > 0 && (r.durability / max) < 0.5
    })
    .sort((a, b) => {
      const maxA = a.maxDurability ?? a.durability
      const maxB = b.maxDurability ?? b.durability
      return (a.durability / maxA) - (b.durability / maxB)
    })

  const robotsForCalc = activeRobots.map((r) => ({
    hashPower:     r.hashPower,
    energyRate:    (r as typeof r & { energyRate?: number }).energyRate ?? 1,
    durability:    r.durability,
    maxDurability: r.maxDurability,
    equipments:    r.equipments?.map((e) => e.equipment) ?? [],
  }))

  // Bônus do Codex do próprio jogador
  const userCodexEntries = allCodexEntries.filter((e) => e.userId === profile.id)
  const { erPct: codexBonusErPct, pdPct: codexBonusPdPct } = computeCodexBonuses(codexCollections, userCodexEntries)

  // Soma de todas as entradas de boost ativas (cada vitória = entrada independente)
  const activeMinigameBoostER = minigameBoost._sum.erFlat ?? 0
  const erBreakdown = calculateFleetER(robotsForCalc, baseUpgrades, activeMinigameBoostER, codexBonusErPct)
  const pdBreakdown = calculateFleetPD(robotsForCalc, codexBonusPdPct)

  // userShareER = ER total do jogador com equipamentos + base upgrades + codex próprios
  const userShareER = erBreakdown.total

  // networkER = Σ do ER de cada jogador calculado com calculateFleetER
  // Inclui codex bonus por jogador para fórmula idêntica à do engine de mineração
  const upgradesByUser = new Map<string, typeof allNetworkUpgrades>()
  for (const upg of allNetworkUpgrades) {
    if (!upgradesByUser.has(upg.userId)) upgradesByUser.set(upg.userId, [])
    upgradesByUser.get(upg.userId)!.push(upg)
  }

  // Agrupa robôs por usuário
  type NetworkRobot = typeof allActiveRobots[0]
  const robotsByUser = new Map<string, NetworkRobot[]>()
  for (const robot of allActiveRobots) {
    if (!robotsByUser.has(robot.userId)) robotsByUser.set(robot.userId, [])
    robotsByUser.get(robot.userId)!.push(robot)
  }

  // Agrupa codex entries por userId para networkER
  const codexEntriesByUser = new Map<string, Array<{ collection: string }>>()
  for (const entry of allCodexEntries) {
    if (!codexEntriesByUser.has(entry.userId)) codexEntriesByUser.set(entry.userId, [])
    codexEntriesByUser.get(entry.userId)!.push(entry)
  }

  // groupBy retorna [{ userId, _sum: { erFlat } }] — monta mapa userId → total ER ativo
  const minigameBoostByUser = new Map(
    allMinigameBoosts.map((b) => [b.userId, b._sum.erFlat ?? 0])
  )

  // Calcula ER de cada jogador com a mesma fórmula e soma
  // Inclui boost de minigame e codex para garantir fórmula idêntica ao mining engine
  let networkER = 0
  for (const [userId, robots] of robotsByUser.entries()) {
    const upgrades          = upgradesByUser.get(userId) ?? []
    const boostER           = minigameBoostByUser.get(userId) ?? 0
    const userEntries       = codexEntriesByUser.get(userId) ?? []
    const { erPct: userCodexErPct } = computeCodexBonuses(codexCollections, userEntries)
    const { total } = calculateFleetER(
      robots.map((r) => ({
        hashPower:     r.hashPower,
        durability:    r.durability,
        maxDurability: r.maxDurability,
        equipments:    (r.equipments ?? []).map((e) => e.equipment),
      })),
      upgrades,
      boostER,
      userCodexErPct
    )
    networkER += total
  }

  const blockRewards = {
    CRATE: Number(process.env.MINING_BLOCK_REWARD_CRATE ?? 100),
    SOL:   Number(process.env.MINING_BLOCK_REWARD_SOL ?? 0),
    LC:    Number(process.env.MINING_BLOCK_REWARD_LC ?? 0),
  }

  const totalER = erBreakdown.total  // para o ERWidget (com base upgrades)

  const quickActions = [
    { label: 'Manage Outpost', href: '/outpost', color: 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5' },
    { label: 'Open Lootbox', href: '/lootbox', color: 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5' },
    { label: 'Play Minigame', href: '/minigames', color: 'border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5' },
    { label: 'View Market', href: '/market', color: 'border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/5' },
  ]

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Welcome, <span className="text-blue-400">{profile.username}</span>
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Your Outpost is {activeRobots.length > 0 ? 'operational' : 'awaiting robots'}
        </p>
      </div>

      {/* ── Repair Alert ────────────────────────────────────── */}
      {robotsNeedingRepair.length > 0 && (
        <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          {/* Ícone */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>

          <div className="flex-1 min-w-0">
            <p className="text-amber-400 text-sm font-medium">
              {robotsNeedingRepair.length === 1
                ? '1 robot needs repair'
                : `${robotsNeedingRepair.length} robots need repair`}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {robotsNeedingRepair.map((r) => {
                const max = r.maxDurability ?? r.durability
                const pct = max > 0 ? Math.round((r.durability / max) * 100) : 0
                return (
                <span key={r.id} className="text-xs text-amber-300/70">
                  {r.name}
                  <span className="text-amber-500/60 ml-1">
                    ({pct}% — {r.isActive ? 'at outpost' : 'in inventory'})
                  </span>
                </span>
              )})}
            </div>
          </div>

          <Link href="/inventory"
            className="shrink-0 text-xs text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap">
            Use Batteries →
          </Link>
        </div>
      )}

      {/* Token Balances — dropdown */}
      <BalanceDropdown
        crate={Number(profile.balanceCrate)}
        sol={Number(profile.balanceSol)}
        lc={Number(profile.balanceLc)}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Active Robots</p>
            <span className="text-blue-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {activeRobots.length}
            <span className="text-gray-600 text-sm font-normal"> / {profile.outpostSlots}</span>
          </p>
          <p className="text-gray-600 text-xs mt-1">Outpost slots</p>
        </div>

        <ERWidget er={erBreakdown} />
        <PDWidget pd={pdBreakdown} />

        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Inventory</p>
            <span className="text-purple-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {profile._count.robots}
            <span className="text-gray-600 text-sm font-normal"> robots</span>
          </p>
          <p className="text-gray-600 text-xs mt-1">in inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Active Robots */}
        <div className="col-span-3 bg-[#111118] border border-gray-800/60 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Robots at Outpost</h3>
            <div className="flex items-center gap-3">
              <RechargeAllButton />
              <Link href="/outpost" className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                Manage →
              </Link>
            </div>
          </div>

          {activeRobots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm mb-3">No active robots at the Outpost</p>
              <Link href="/outpost"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
                Deploy Robots
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRobots.map((robot) => (
                <RobotCard key={robot.id} robot={robot} variant="mini" slotNumber={robot.outpostSlot ?? undefined} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="col-span-2 space-y-3">
          {/* Base Upgrades Status */}
          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-3">Base Status</h3>
            <div className="space-y-2">
              {([1, 2] as const).map((slot) => {
                const upgrade = baseUpgrades.find((u) => u.appliedSlot === slot)
                return upgrade ? (
                  <EquipmentCard
                    key={slot}
                    item={upgrade}
                    variant="base"
                    slot={slot}
                    slotLabel={BASE_SLOT_LABELS[slot]}
                  />
                ) : (
                  <EmptyEquipmentSlot
                    key={slot}
                    slot={slot}
                    slotLabel={BASE_SLOT_LABELS[slot]}
                    variant="base"
                  />
                )
              })}
            </div>
          </div>

          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`block w-full text-left px-4 py-2.5 rounded-lg border text-gray-300 text-sm transition-all ${action.color}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <MiningRewardsCard
            userER={userShareER}
            networkER={networkER}
            blockRewards={blockRewards}
            lastBlockAt={lastBlock?.processedAt.toISOString() ?? null}
            totalMined={totalMined._sum.amount ?? 0}
            allocation={{
              CRATE: profile.allocationCrate,
              SOL:   profile.allocationSol,
              LC:    profile.allocationLc,
            }}
          />
        </div>
      </div>
    </div>
  )
}
