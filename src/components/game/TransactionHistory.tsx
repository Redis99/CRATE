'use client'

import { useState, useMemo } from 'react'
import { formatDate } from '@/lib/formatting'

type TxType = string
type TxStatus = string

interface Transaction {
  id: string
  type: TxType
  token: string
  amount: number
  txHash: string | null
  status: TxStatus
  createdAt: Date | string
}

const TX_TYPE_LABEL: Record<string, string> = {
  DEPOSIT: 'Deposit', WITHDRAW: 'Withdrawal', LOOTBOX_PURCHASE: 'Lootbox Purchase',
  SHOP_PURCHASE: 'Shop Purchase', MARKET_SALE: 'Market Sale', MARKET_PURCHASE: 'Market Purchase',
  MINING_REWARD: 'Mining Reward', CONVERSION: 'Conversion', WEEKLY_DROP: 'Weekly Drop',
  MISSION_REWARD: 'Mission Reward', RANKING_REWARD: 'Ranking Reward',
}

const TX_STATUS_STYLES: Record<string, string> = {
  PENDING:   'text-yellow-400',
  CONFIRMED: 'text-green-400',
  FAILED:    'text-red-400',
}

const INCOMING = new Set(['DEPOSIT', 'MINING_REWARD', 'WEEKLY_DROP', 'MISSION_REWARD', 'RANKING_REWARD', 'MARKET_SALE'])

type HistoryTab = 'all' | 'deposits' | 'ingame' | 'withdrawals'

const HISTORY_TABS: { key: HistoryTab; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'ingame',      label: 'In-Game' },
  { key: 'deposits',    label: 'Deposits' },
  { key: 'withdrawals', label: 'Withdrawals' },
]

const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_CRATE_ENV === 'mainnet' ? 'mainnet-beta' : 'devnet'

function explorerUrl(txHash: string) {
  return `https://solscan.io/tx/${txHash}?cluster=${SOLANA_CLUSTER}`
}

function shortHash(hash: string) {
  return `${hash.slice(0, 6)}...${hash.slice(-6)}`
}


const PAGE_SIZE = 10

interface TransactionHistoryProps {
  transactions: Transaction[]
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('all')
  const [page, setPage]           = useState(1)
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const filtered = useMemo(() => {
    let txs = transactions

    // Tab filter
    if (activeTab === 'deposits')    txs = txs.filter((t) => t.type === 'DEPOSIT')
    if (activeTab === 'withdrawals') txs = txs.filter((t) => t.type === 'WITHDRAW')
    if (activeTab === 'ingame')      txs = txs.filter((t) => !['DEPOSIT', 'WITHDRAW'].includes(t.type))

    // Date filter
    if (dateFrom) txs = txs.filter((t) => new Date(t.createdAt) >= new Date(dateFrom))
    if (dateTo)   txs = txs.filter((t) => new Date(t.createdAt) <= new Date(dateTo + 'T23:59:59'))

    return txs
  }, [transactions, activeTab, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function changeTab(tab: HistoryTab) { setActiveTab(tab); setPage(1) }

  return (
    <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
      <h3 className="text-white font-semibold text-sm mb-4">Transaction History</h3>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0d15] rounded-lg p-1 mb-4">
        {HISTORY_TABS.map(({ key, label }) => (
          <button key={key} onClick={() => changeTab(key)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              activeTab === key ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <label className="text-gray-600 text-xs block mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="w-full bg-[#0d0d15] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gray-600 [color-scheme:dark]" />
        </div>
        <div className="flex-1">
          <label className="text-gray-600 text-xs block mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="w-full bg-[#0d0d15] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gray-600 [color-scheme:dark]" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
            className="self-end px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Transactions */}
      {paginated.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-6">No transactions found.</p>
      ) : (
        <div className="space-y-1">
          {paginated.map((tx) => {
            const isIn = INCOMING.has(tx.type)
            const statusColor = TX_STATUS_STYLES[tx.status] ?? 'text-gray-400'
            return (
              <div key={tx.id} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[#0d0d15] transition-colors">
                <div className="flex items-center gap-3">
                  <span className={isIn ? 'text-green-400' : 'text-red-400'}>
                    {isIn
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 19 19 12"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 5 5 12"/></svg>
                    }
                  </span>
                  <div>
                    <p className="text-gray-300 text-sm">{TX_TYPE_LABEL[tx.type] ?? tx.type}</p>
                    <p className="text-gray-600 text-xs">{formatDate(tx.createdAt)}</p>
                    {tx.txHash && (
                      <a href={explorerUrl(tx.txHash)} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500/70 hover:text-blue-400 text-xs font-mono transition-colors">
                        {shortHash(tx.txHash)} ↗
                      </a>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-medium ${isIn ? 'text-green-400' : 'text-red-400'}`}>
                    {isIn ? '+' : '-'}{Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.token}
                  </p>
                  <p className={`text-xs ${statusColor}`}>{tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/60">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ← Previous
          </button>
          <span className="text-gray-600 text-xs">Page {page} of {totalPages} · {filtered.length} transactions</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
