import 'server-only'
import { prisma } from '@/lib/prisma'
import { effectiveER, effectiveERWithEquipment, durabilityDecayPerBlock } from '@/lib/game-math'

export { effectiveER }

const MIN_BLOCK_REWARD_CRATE = 10
const BLOCKS_PER_HOUR        = 4
const BLOCK_INTERVAL_MS      = (60 / BLOCKS_PER_HOUR) * 60 * 1000  // 15 min
// Guarda de segurança: não processa se o último bloco tem menos de 80% do intervalo
const MIN_INTERVAL_MS        = BLOCK_INTERVAL_MS * 0.8              // 12 min

/**
 * Processa um bloco de mineração com alocação por moeda.
 *
 * Melhorias de resiliência e desempenho:
 * - Verifica o intervalo mínimo desde o último bloco (evita duplo disparo do cron)
 * - Usa createMany para inserção em lote de MiningRewards (reduz round-trips ao DB)
 * - Usa Promise.all apenas para operações independentes
 */
export async function processBlock() {
  // ── Guarda de resiliência: verifica o último bloco ────────────────────────
  const lastBlock = await prisma.miningBlock.findFirst({
    orderBy: { processedAt: 'desc' },
    select: { id: true, processedAt: true },
  })

  if (lastBlock) {
    const elapsed = Date.now() - lastBlock.processedAt.getTime()
    if (elapsed < MIN_INTERVAL_MS) {
      console.log(`[mining] Skipped — last block was ${Math.round(elapsed / 1000)}s ago (min: ${MIN_INTERVAL_MS / 1000}s)`)
      return {
        skipped: true,
        lastBlockId: lastBlock.id,
        elapsedSeconds: Math.round(elapsed / 1000),
      }
    }
  }

  const blockRewardCrate = Number(process.env.MINING_BLOCK_REWARD_CRATE ?? MIN_BLOCK_REWARD_CRATE)
  const blockRewardSol   = Number(process.env.MINING_BLOCK_REWARD_SOL ?? 0)
  const blockRewardLc    = Number(process.env.MINING_BLOCK_REWARD_LC ?? 0)

  // 1. Busca todos os robôs ativos com equipamentos instalados
  const activeRobots = await prisma.robot.findMany({
    where: { isActive: true },
    select: {
      id: true, userId: true, hashPower: true, durability: true, energyRate: true,
      equipments: {
        select: {
          equipment: {
            select: { effectType: true, effectValue: true, effectType2: true, effectValue2: true },
          },
        },
      },
    },
  })

  // 1b. Base upgrades aplicados de todos os jogadores ativos
  const allActiveUserIds = [...new Set(activeRobots.map((r) => r.userId))]
  const allBaseUpgrades = await prisma.baseUpgrade.findMany({
    where: { userId: { in: allActiveUserIds }, isApplied: true },
    select: { userId: true, effectType: true, effectValue: true, effectType2: true, effectValue2: true },
  })

  // Agrupa base upgrades por userId
  const baseUpgradesByUser = new Map<string, typeof allBaseUpgrades>()
  for (const upg of allBaseUpgrades) {
    if (!baseUpgradesByUser.has(upg.userId)) baseUpgradesByUser.set(upg.userId, [])
    baseUpgradesByUser.get(upg.userId)!.push(upg)
  }

  if (activeRobots.length === 0) {
    const block = await prisma.miningBlock.create({
      data: { totalHashPower: 0, rewardCrate: 0, rewardSol: 0, rewardLc: 0 },
    })
    return { blockNumber: block.id, totalHashPower: 0, playersRewarded: 0, skipped: false }
  }

  // 2. Agrupa ER efetivo por usuário — inclui equipamentos + base upgrades
  // Mesma fórmula do display (calculateFleetER), garantindo consistência
  const userERMap = new Map<string, number>()
  for (const robot of activeRobots) {
    const equips     = robot.equipments.map((e) => e.equipment)
    const upgrades   = baseUpgradesByUser.get(robot.userId) ?? []
    const boosted    = effectiveERWithEquipment(robot.hashPower, equips)

    // Aplica GLOBAL_EFFICIENCY_PCT e HASH_POWER_PCT das base upgrades
    let globalPct = 0
    for (const upg of upgrades) {
      if (upg.effectType  === 'GLOBAL_EFFICIENCY_PCT' || upg.effectType  === 'HASH_POWER_PCT') globalPct += upg.effectValue
      if (upg.effectType2 === 'GLOBAL_EFFICIENCY_PCT' || upg.effectType2 === 'HASH_POWER_PCT') globalPct += (upg.effectValue2 ?? 0)
    }

    const withBase = boosted * (1 + globalPct / 100)
    const er = effectiveER(withBase, robot.durability)
    userERMap.set(robot.userId, (userERMap.get(robot.userId) ?? 0) + er)
  }

  // 3. Busca alocações dos jogadores ativos
  const userIds = Array.from(userERMap.keys())
  const allocations = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, allocationCrate: true, allocationSol: true, allocationLc: true },
  })
  const allocationMap = new Map(allocations.map((u) => [u.id, u]))

  // 4. Calcula os pools de ER por moeda
  let poolCrate = 0, poolSol = 0, poolLc = 0
  for (const [userId, er] of userERMap.entries()) {
    const alloc = allocationMap.get(userId)
    if (!alloc) continue
    poolCrate += er * (alloc.allocationCrate / 100)
    poolSol   += er * (alloc.allocationSol   / 100)
    poolLc    += er * (alloc.allocationLc    / 100)
  }

  // 5. Calcula recompensas — separadas em arrays para createMany
  const userBalanceUpdates: { userId: string; crate: number; sol: number; lc: number }[] = []
  const miningRewardsData: { userId: string; token: 'CRATE' | 'SOL' | 'LC'; amount: number; blockNumber: number }[] = []
  let totalCrate = 0, totalSol = 0, totalLc = 0
  let playersRewarded = 0

  for (const [userId, er] of userERMap.entries()) {
    const alloc = allocationMap.get(userId)
    if (!alloc || er === 0) continue

    const rewardCrate = poolCrate > 0 ? (er * alloc.allocationCrate / 100 / poolCrate) * blockRewardCrate : 0
    const rewardSol   = poolSol   > 0 ? (er * alloc.allocationSol   / 100 / poolSol)   * blockRewardSol   : 0
    const rewardLc    = poolLc    > 0 ? (er * alloc.allocationLc    / 100 / poolLc)    * blockRewardLc    : 0

    totalCrate += rewardCrate
    totalSol   += rewardSol
    totalLc    += rewardLc
    playersRewarded++

    userBalanceUpdates.push({ userId, crate: rewardCrate, sol: rewardSol, lc: rewardLc })
    // blockNumber será preenchido após criar o bloco
    if (rewardCrate > 0) miningRewardsData.push({ userId, token: 'CRATE', amount: rewardCrate, blockNumber: 0 })
    if (rewardSol   > 0) miningRewardsData.push({ userId, token: 'SOL',   amount: rewardSol,   blockNumber: 0 })
    if (rewardLc    > 0) miningRewardsData.push({ userId, token: 'LC',    amount: rewardLc,    blockNumber: 0 })
  }

  // 6. Calcula desgaste de durabilidade
  const robotUpdates: { id: string; durability: number; deactivate: boolean }[] = []
  for (const robot of activeRobots) {
    const newDurability = Math.max(0, robot.durability - durabilityDecayPerBlock(robot.energyRate))
    robotUpdates.push({ id: robot.id, durability: newDurability, deactivate: newDurability === 0 })
  }
  const robotsToDeactivate = robotUpdates.filter((r) => r.deactivate)

  // 7. Cria o bloco para obter o blockNumber
  const totalNetworkER = Array.from(userERMap.values()).reduce((s, v) => s + v, 0)
  const block = await prisma.miningBlock.create({
    data: { totalHashPower: totalNetworkER, rewardCrate: totalCrate, rewardSol: totalSol, rewardLc: totalLc },
  })

  // Atualiza blockNumber nos registros de recompensa
  for (const r of miningRewardsData) r.blockNumber = block.id

  // 8. Executa writes em paralelo — Prisma ORM padrão (compatível com PgBouncer)
  await Promise.all([
    // Saldos dos jogadores
    ...userBalanceUpdates.map(({ userId, crate, sol, lc }) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(crate > 0 && { balanceCrate: { increment: crate } }),
          ...(sol   > 0 && { balanceSol:   { increment: sol   } }),
          ...(lc    > 0 && { balanceLc:    { increment: lc    } }),
        },
      })
    ),
    // Recompensas em lote
    miningRewardsData.length > 0 && prisma.miningReward.createMany({ data: miningRewardsData }),
    // Durabilidade dos robôs ativos
    ...robotUpdates
      .filter((r) => !r.deactivate)
      .map((r) => prisma.robot.update({ where: { id: r.id }, data: { durability: r.durability } })),
    // Robôs desativados em lote
    robotsToDeactivate.length > 0 && prisma.robot.updateMany({
      where: { id: { in: robotsToDeactivate.map((r) => r.id) } },
      data: { durability: 0, isActive: false, outpostSlot: null },
    }),
  ].filter(Boolean))

  // 9. Notifica donos de robôs que pararam (após writes principais)
  if (robotsToDeactivate.length > 0) {
    const broken = await prisma.robot.findMany({
      where: { id: { in: robotsToDeactivate.map((r) => r.id) } },
      select: { userId: true, name: true },
    })
    await prisma.notification.createMany({
      data: broken.map((r) => ({
        userId: r.userId,
        title: 'Robot offline',
        message: `${r.name} ran out of energy and was removed from the Outpost. Recharge it to resume mining.`,
      })),
    })
  }

  console.log(
    `[mining] Block #${block.id} — ${totalNetworkER.toFixed(1)} ER — ` +
    `${totalCrate.toFixed(4)} CRATE | ${totalSol.toFixed(6)} SOL | ${totalLc.toFixed(4)} LC — ` +
    `${playersRewarded} player(s) | ${robotsToDeactivate.length} robot(s) deactivated`
  )

  return {
    skipped: false,
    blockNumber: block.id,
    totalHashPower: totalNetworkER,
    playersRewarded,
    rewards: { crate: totalCrate, sol: totalSol, lc: totalLc },
    robotsDeactivated: robotsToDeactivate.length,
  }
}
