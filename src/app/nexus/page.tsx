'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalUsers: number
  activeUsersToday: number
  pendingWithdrawals: number
  totalCrateInGame: number
  totalRobots: number
  recentTransactions: Array<{
    id: string
    type: string
    token: string
    amount: number
    status: string
    createdAt: string
    user: { username: string }
  }>
}

export default function BackstageDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [seedMsg, setSeedMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

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

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-purple-300 font-mono">Control Center</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} />
        <StatCard label="Active (24h)" value={stats?.activeUsersToday ?? 0} />
        <StatCard
          label="Pending Withdrawals"
          value={stats?.pendingWithdrawals ?? 0}
          urgent={(stats?.pendingWithdrawals ?? 0) > 0}
        />
        <StatCard label="CRATE In-Game" value={(stats?.totalCrateInGame ?? 0).toFixed(2)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Robots" value={stats?.totalRobots ?? 0} />
      </div>

      {/* Quick Actions */}
      <div className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runAction('trigger-mining', 'Mining Block')}
            className="px-3 py-1.5 text-xs bg-purple-800/50 hover:bg-purple-700/50 text-purple-200 rounded border border-purple-700/30 transition-colors"
          >
            Trigger Mining Block
          </button>
          {['seed-missions','seed-crafting','seed-lootbox','seed-shop','seed-codex'].map(a => (
            <button
              key={a}
              onClick={() => runAction(a, a)}
              className="px-3 py-1.5 text-xs bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 rounded border border-gray-700/30 transition-colors"
            >
              {a.replace('seed-', 'Seed ').replace(/^./, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        {seedMsg && (
          <p className="mt-2 text-xs text-yellow-400 font-mono break-all">{seedMsg}</p>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Transactions</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left pb-2">User</th>
              <th className="text-left pb-2">Type</th>
              <th className="text-left pb-2">Token</th>
              <th className="text-right pb-2">Amount</th>
              <th className="text-left pb-2">Status</th>
              <th className="text-left pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {stats?.recentTransactions.map(tx => (
              <tr key={tx.id} className="border-b border-gray-900 hover:bg-gray-900/30">
                <td className="py-1.5 text-gray-300">{tx.user.username}</td>
                <td className="py-1.5 text-gray-400">{tx.type}</td>
                <td className="py-1.5 text-gray-400">{tx.token}</td>
                <td className="py-1.5 text-right text-gray-200">{tx.amount.toFixed(4)}</td>
                <td className="py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    tx.status === 'CONFIRMED' ? 'bg-green-900/40 text-green-400' :
                    tx.status === 'PENDING'   ? 'bg-yellow-900/40 text-yellow-400' :
                    'bg-red-900/40 text-red-400'
                  }`}>
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
    </div>
  )
}

function StatCard({
  label,
  value,
  urgent,
}: {
  label: string
  value: number | string
  urgent?: boolean
}) {
  return (
    <div className={`bg-[#0d0d1a] border rounded-lg p-4 ${
      urgent ? 'border-red-700/50' : 'border-purple-900/30'
    }`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${urgent ? 'text-red-400' : 'text-purple-300'}`}>
        {value}
      </p>
    </div>
  )
}
