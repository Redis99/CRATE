'use client'

import { useEffect, useState, useCallback } from 'react'

interface Transaction {
  id: string
  type: string
  token: string
  amount: number
  status: string
  createdAt: string
  user: { username: string }
}

interface Stats {
  totalUsers: number
  activeUsersToday: number
  pendingWithdrawals: number
  totalCrateInGame: number
  totalRobots: number
  recentTransactions: Transaction[]
}

interface TxPage {
  transactions: Transaction[]
  total: number
  page: number
  pages: number
}

const TX_TABS = [
  { key: 'ALL',              label: 'All' },
  { key: 'DEPOSIT',          label: 'Deposits' },
  { key: 'WITHDRAW',         label: 'Withdrawals' },
  { key: 'LOOTBOX_PURCHASE', label: 'Lootbox' },
  { key: 'SHOP_PURCHASE',    label: 'Shop' },
  { key: 'MARKET_SALE',      label: 'Market' },
  { key: 'MINING_REWARD',    label: 'Mining' },
  { key: 'MISSION_REWARD',   label: 'Missions' },
  { key: 'RANKING_REWARD',   label: 'Ranking' },
  { key: 'WEEKLY_DROP',      label: 'Weekly Drop' },
]

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: 'bg-green-900/40 text-green-400',
  PENDING:   'bg-yellow-900/40 text-yellow-400',
  FAILED:    'bg-red-900/40 text-red-400',
}

export default function NexusDashboard() {
  const [stats, setStats]           = useState<Stats | null>(null)
  const [loading, setLoading]       = useState(true)
  const [seedMsg, setSeedMsg]       = useState('')
  const [txTab, setTxTab]           = useState('ALL')
  const [userSearch, setUserSearch] = useState('')
  const [txData, setTxData]         = useState<TxPage | null>(null)
  const [txPage, setTxPage]         = useState(1)
  const [txLoading, setTxLoading]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const loadTx = useCallback(async (tab: string, user: string, page: number) => {
    setTxLoading(true)
    const params = new URLSearchParams({ txType: tab, username: user, page: String(page) })
    const r = await fetch(`/api/admin/stats?${params}`)
    setTxData(await r.json())
    setTxLoading(false)
  }, [])

  // Reload transactions when tab or page changes
  useEffect(() => {
    loadTx(txTab, userSearch, txPage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txTab, txPage])

  async function runAction(action: string, label: string) {
    setSeedMsg(`Running ${label}…`)
    const r = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await r.json()
    setSeedMsg(`${label}: ${JSON.stringify(data)}`)
  }

  function handleUserSearch(e: React.FormEvent) {
    e.preventDefault()
    setTxPage(1)
    loadTx(txTab, userSearch, 1)
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-purple-300 font-mono">Control Center</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Users"         value={stats?.totalUsers ?? 0} />
        <StatCard label="Active (24h)"        value={stats?.activeUsersToday ?? 0} />
        <StatCard label="Pending Withdrawals" value={stats?.pendingWithdrawals ?? 0}
          urgent={(stats?.pendingWithdrawals ?? 0) > 0} />
        <StatCard label="CRATE In-Game"       value={(stats?.totalCrateInGame ?? 0).toFixed(2)} />
        <StatCard label="Total Robots"        value={stats?.totalRobots ?? 0} />
      </div>

      {/* Quick Actions */}
      <div className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => runAction('trigger-mining', 'Mining Block')}
            className="px-3 py-1.5 text-xs bg-purple-800/50 hover:bg-purple-700/50 text-purple-200 rounded border border-purple-700/30 transition-colors">
            Trigger Mining Block
          </button>
          {['seed-robots','seed-parts','seed-consumables','seed-missions','seed-crafting','seed-lootbox','seed-shop','seed-codex'].map(a => (
            <button key={a} onClick={() => runAction(a, a)}
              className="px-3 py-1.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-700/30 transition-colors">
              {a.replace('seed-', 'Seed ').replace(/^./, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        {seedMsg && <p className="mt-2 text-xs text-yellow-400 font-mono break-all">{seedMsg}</p>}
      </div>

      {/* Transactions */}
      <div className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Transactions</h2>

        {/* Type tabs */}
        <div className="flex gap-1 flex-wrap">
          {TX_TABS.map(t => (
            <button key={t.key}
              onClick={() => { setTxTab(t.key); setTxPage(1) }}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                txTab === t.key
                  ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                  : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* User filter */}
        <form onSubmit={handleUserSearch} className="flex gap-2">
          <input
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            placeholder="Filter by username…"
            className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 outline-none focus:border-purple-700"
          />
          <button type="submit"
            className="px-3 py-1 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded hover:bg-gray-700">
            Filter
          </button>
          {userSearch && (
            <button type="button"
              onClick={() => { setUserSearch(''); loadTx(txTab, '', txPage) }}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300">
              ✕
            </button>
          )}
        </form>

        {txLoading ? (
          <p className="text-xs text-gray-500 py-2">Loading…</p>
        ) : (
          <>
            {txData && (
              <p className="text-xs text-gray-600">
                {txData.total} result{txData.total !== 1 ? 's' : ''}
                {userSearch && ` for "${userSearch}"`}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2 pr-3">User</th>
                    <th className="text-left pb-2 pr-3">Type</th>
                    <th className="text-left pb-2 pr-3">Token</th>
                    <th className="text-right pb-2 pr-3">Amount</th>
                    <th className="text-left pb-2 pr-3">Status</th>
                    <th className="text-left pb-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(txData?.transactions ?? stats?.recentTransactions ?? []).map(tx => (
                    <tr key={tx.id} className="border-b border-gray-900 hover:bg-gray-900/30">
                      <td className="py-1.5 pr-3 text-gray-300">{tx.user.username}</td>
                      <td className="py-1.5 pr-3 text-gray-400">{tx.type}</td>
                      <td className="py-1.5 pr-3 text-gray-400">{tx.token}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-200">{tx.amount.toFixed(4)}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded ${STATUS_COLOR[tx.status] ?? 'text-gray-400'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-1.5 text-gray-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {txData && txData.pages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button disabled={txPage === 1}
                  onClick={() => setTxPage(p => p - 1)}
                  className="px-3 py-1 text-xs border border-gray-700 text-gray-400 rounded disabled:opacity-30">
                  ← Prev
                </button>
                <span className="text-xs text-gray-500">{txPage} / {txData.pages}</span>
                <button disabled={txPage === txData.pages}
                  onClick={() => setTxPage(p => p + 1)}
                  className="px-3 py-1 text-xs border border-gray-700 text-gray-400 rounded disabled:opacity-30">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, urgent }: { label: string; value: number | string; urgent?: boolean }) {
  return (
    <div className={`bg-[#0d0d1a] border rounded-lg p-4 ${urgent ? 'border-red-700/50' : 'border-purple-900/30'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${urgent ? 'text-red-400' : 'text-purple-300'}`}>{value}</p>
    </div>
  )
}
