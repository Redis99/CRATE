import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ERIcon } from '@/components/ui/ERIcon'
import { BalanceDropdown } from '@/components/game/BalanceDropdown'
import { MiningRewardsCard } from '@/components/game/MiningRewardsCard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — Inside the Crate',
}

function effectiveER(hashPower: number, durability: number): number {
  if (durability === 0) return 0
  if (durability <= 20) return hashPower * 0.4
  if (durability <= 50) return hashPower * 0.8
  return hashPower
}

async function getDashboardData() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [profile, allActiveRobots, lastBlock, totalMined] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
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
            id: true,
            hashPower: true,
            durability: true,
            rarity: true,
            name: true,
            outpostSlot: true,
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
    // ER total da rede (todos os robôs ativos de todos os jogadores)
    prisma.robot.findMany({
      where: { isActive: true },
      select: { hashPower: true, durability: true },
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
  ])

  return { profile, allActiveRobots, lastBlock, totalMined }
}

function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    COMMON: 'text-gray-400 bg-gray-400/10',
    UNCOMMON: 'text-green-400 bg-green-400/10',
    RARE: 'text-blue-400 bg-blue-400/10',
    EPIC: 'text-purple-400 bg-purple-400/10',
    LEGENDARY: 'text-yellow-400 bg-yellow-400/10',
  }
  const labels: Record<string, string> = {
    COMMON: 'Common', UNCOMMON: 'Uncommon', RARE: 'Rare', EPIC: 'Epic', LEGENDARY: 'Legendary',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[rarity] ?? colors.COMMON}`}>
      {labels[rarity] ?? rarity}
    </span>
  )
}

function DurabilityBar({ value }: { value: number }) {
  const color = value > 50 ? 'bg-green-500' : value > 20 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${value}%` }} />
    </div>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data?.profile) {
    return <div className="p-8 text-gray-400">Loading profile...</div>
  }

  const { profile, allActiveRobots, lastBlock, totalMined } = data
  const activeRobots = profile.robots

  const userER = activeRobots.reduce((sum, r) => sum + effectiveER(r.hashPower, r.durability), 0)
  const networkER = allActiveRobots.reduce((sum, r) => sum + effectiveER(r.hashPower, r.durability), 0)

  const blockRewards = {
    CRATE: Number(process.env.MINING_BLOCK_REWARD_CRATE ?? 100),
    SOL:   Number(process.env.MINING_BLOCK_REWARD_SOL ?? 0),
    LC:    Number(process.env.MINING_BLOCK_REWARD_LC ?? 0),
  }

  const totalER = userER

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

        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Extraction Rate</p>
            <span className="text-green-400">
              <ERIcon size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {totalER.toFixed(1)} <span className="text-gray-600 text-sm font-normal">ER</span>
          </p>
          <p className="text-gray-600 text-xs mt-1">mining power</p>
        </div>

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
            <Link href="/outpost" className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
              Manage →
            </Link>
          </div>

          {activeRobots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm mb-3">No active robots at the Outpost</p>
              <Link
                href="/outpost"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Deploy Robots
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRobots.map((robot) => (
                <div key={robot.id} className="flex items-center justify-between bg-[#0d0d15] rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-sm font-medium truncate">{robot.name}</span>
                      <RarityBadge rarity={robot.rarity} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{robot.hashPower} ER base</span>
                      <span>Slot {robot.outpostSlot}</span>
                    </div>
                    <DurabilityBar value={robot.durability} />
                    <p className="text-xs text-gray-600 mt-0.5">{robot.durability}% durability</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="col-span-2 space-y-3">
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
            userER={userER}
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
