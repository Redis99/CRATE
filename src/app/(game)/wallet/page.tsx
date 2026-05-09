import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import { DepositAddress } from '@/components/game/DepositAddress'
import { WalletAutoRefresh } from '@/components/game/WalletAutoRefresh'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wallet — Inside the Crate',
}

const SOLANA_CLUSTER = process.env.CRATE_TOKEN_MINT === 'native' ? 'devnet' : 'mainnet-beta'

function explorerUrl(txHash: string) {
  return `https://solscan.io/tx/${txHash}?cluster=${SOLANA_CLUSTER}`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`
}

const TX_TYPE_LABEL: Record<string, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdrawal',
  LOOTBOX_PURCHASE: 'Lootbox Purchase',
  SHOP_PURCHASE: 'Shop Purchase',
  MARKET_SALE: 'Market Sale',
  MARKET_PURCHASE: 'Market Purchase',
  MINING_REWARD: 'Mining Reward',
  CONVERSION: 'Conversion',
  WEEKLY_DROP: 'Weekly Drop',
  MISSION_REWARD: 'Mission Reward',
  RANKING_REWARD: 'Ranking Reward',
}

const TX_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  CONFIRMED: { label: 'Confirmed', color: 'text-green-400' },
  FAILED: { label: 'Failed', color: 'text-red-400' },
}

const WITHDRAW_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  PROCESSING: { label: 'Processing', color: 'text-blue-400' },
  COMPLETED: { label: 'Completed', color: 'text-green-400' },
  FAILED: { label: 'Failed', color: 'text-red-400' },
}

async function getWalletData() {
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

  const [profile, transactions, withdrawRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        depositAddress: true,
        balanceCrate: true,
        balanceSol: true,
        balanceLc: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.withdrawRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return { profile, transactions, withdrawRequests }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default async function WalletPage() {
  const data = await getWalletData()

  if (!data?.profile) {
    return <div className="p-8 text-gray-400">Loading wallet...</div>
  }

  const { profile, transactions, withdrawRequests } = data

  return (
    <div className="p-8 max-w-4xl">
      <WalletAutoRefresh />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Wallet</h2>
        <p className="text-gray-500 text-sm mt-1">Deposit, balance and transaction history</p>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">CRATE</p>
          <p className="text-white text-xl font-bold font-mono">
            {Number(profile.balanceCrate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-gray-600 text-xs mt-1">Main currency</p>
        </div>
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SOL</p>
          <p className="text-white text-xl font-bold font-mono">
            {Number(profile.balanceSol).toLocaleString('en-US', { minimumFractionDigits: 4 })}
          </p>
          <p className="text-gray-600 text-xs mt-1">Minable</p>
        </div>
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">LC Shib</p>
          <p className="text-white text-xl font-bold font-mono">
            {Number(profile.balanceLc).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-gray-600 text-xs mt-1">Minable</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Deposit */}
        <div className="col-span-3 bg-[#111118] border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-1">Deposit Address</h3>
          <p className="text-gray-500 text-xs mb-4">
            Send $CRATE to this address. Credit is automatic after blockchain confirmation.
          </p>
          <DepositAddress address={profile.depositAddress} />
        </div>

        {/* Withdrawals info */}
        <div className="col-span-2 bg-[#111118] border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Withdrawals</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <p className="text-gray-400 text-xs leading-relaxed">
                Withdrawals are manually processed by the admin <strong className="text-gray-300">once per day</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <p className="text-gray-400 text-xs leading-relaxed">
                Coming soon to the panel. For now, contact support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending withdrawals */}
      {withdrawRequests.length > 0 && (
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 mb-6">
          <h3 className="text-white font-semibold text-sm mb-4">Withdrawal Requests</h3>
          <div className="space-y-2">
            {withdrawRequests.map((req) => {
              const status = WITHDRAW_STATUS_LABEL[req.status] ?? { label: req.status, color: 'text-gray-400' }
              return (
                <div key={req.id} className="flex items-center justify-between bg-[#0d0d15] rounded-lg px-4 py-3">
                  <div>
                    <p className="text-gray-300 text-sm font-medium">
                      {Number(req.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {req.token}
                    </p>
                    <p className="text-gray-600 text-xs mt-0.5">{formatDate(req.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Transaction History</h3>

        {transactions.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => {
              const isIncoming = ['DEPOSIT', 'MINING_REWARD', 'WEEKLY_DROP', 'MISSION_REWARD', 'RANKING_REWARD', 'MARKET_SALE'].includes(tx.type)
              const status = TX_STATUS_LABEL[tx.status] ?? { label: tx.status, color: 'text-gray-400' }
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-[#0d0d15] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={isIncoming ? 'text-green-400' : 'text-red-400'}>
                      {isIncoming ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 19 19 12" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 5 5 12" />
                        </svg>
                      )}
                    </span>
                    <div>
                      <p className="text-gray-300 text-sm">{TX_TYPE_LABEL[tx.type] ?? tx.type}</p>
                      <p className="text-gray-600 text-xs">{formatDate(tx.createdAt)}</p>
                      {tx.txHash && (
                        <a
                          href={explorerUrl(tx.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500/70 hover:text-blue-400 text-xs font-mono transition-colors"
                        >
                          {shortHash(tx.txHash)} ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-medium ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                      {isIncoming ? '+' : '-'}
                      {Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.token}
                    </p>
                    <p className={`text-xs ${status.color}`}>{status.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
