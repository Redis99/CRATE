import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/formatting'
import { DepositAddress } from '@/components/game/DepositAddress'
import { WalletAutoRefresh } from '@/components/game/WalletAutoRefresh'
import { TransactionHistory } from '@/components/game/TransactionHistory'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wallet — Inside the Crate',
}

const WITHDRAW_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pending',    color: 'text-yellow-400' },
  PROCESSING: { label: 'Processing', color: 'text-blue-400'   },
  COMPLETED:  { label: 'Completed',  color: 'text-green-400'  },
  FAILED:     { label: 'Failed',     color: 'text-red-400'    },
}

async function getWalletData() {
  const user = await getServerUser()
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

        {/* Withdrawals */}
        <div className="col-span-2 bg-[#111118] border border-gray-800/60 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3">Withdrawals</h3>
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            Processed manually by the admin <strong className="text-gray-300">once per day</strong>.
            Minimum amount and destination address required.
          </p>
          <button
            disabled
            title="Withdrawal panel coming soon"
            className="w-full py-2 rounded-lg border border-gray-700 text-gray-600 text-sm cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
            </svg>
            Request Withdrawal
            <span className="text-xs text-gray-700 ml-1">(coming soon)</span>
          </button>
          {withdrawRequests.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {withdrawRequests.map((req) => {
                const status = WITHDRAW_STATUS_LABEL[req.status] ?? { label: req.status, color: 'text-gray-400' }
                return (
                  <div key={req.id} className="flex items-center justify-between bg-[#0d0d15] rounded-lg px-3 py-2">
                    <p className="text-gray-300 text-xs">{Number(req.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {req.token}</p>
                    <span className={`text-xs ${status.color}`}>{status.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction History — client component com abas, paginação e filtro */}
      <TransactionHistory transactions={transactions} />
    </div>
  )
}
