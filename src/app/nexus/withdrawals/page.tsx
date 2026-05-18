'use client'

import { useEffect, useState } from 'react'

interface Withdrawal {
  id: string
  token: string
  amount: number
  toAddress: string
  status: string
  txHash: string | null
  createdAt: string
  processedAt: string | null
  user: { username: string; email: string }
}

export default function WithdrawalsPage() {
  const [items, setItems]     = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('PENDING')
  const [txHash, setTxHash]   = useState<Record<string, string>>({})
  const [msg, setMsg]         = useState('')

  async function load(status: string) {
    setLoading(true)
    const r = await fetch(`/api/admin/withdrawals?status=${status}`)
    setItems(await r.json())
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  async function update(id: string, status: 'PROCESSING' | 'COMPLETED' | 'FAILED') {
    setMsg('Updating…')
    const r = await fetch('/api/admin/withdrawals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, txHash: txHash[id] }),
    })
    if (r.ok) {
      setMsg(`Marked as ${status}`)
      load(filter)
    } else {
      setMsg('Error updating')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Withdrawals</h1>
        <div className="flex gap-2">
          {['PENDING','PROCESSING','COMPLETED','FAILED'].map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); load(s) }}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                filter === s
                  ? 'bg-purple-800/60 border-purple-600 text-purple-200'
                  : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No {filter.toLowerCase()} withdrawals.</p>
      ) : (
        <div className="space-y-3">
          {items.map(w => (
            <div
              key={w.id}
              className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-200">{w.user.username}</span>
                    <span className="text-xs text-gray-500">{w.user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-purple-300 font-bold">{w.amount} {w.token}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-gray-400 font-mono text-xs">{w.toAddress}</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Requested {new Date(w.createdAt).toLocaleString()}
                    {w.processedAt && ` · Processed ${new Date(w.processedAt).toLocaleString()}`}
                  </p>
                  {w.txHash && (
                    <p className="text-xs text-green-400 font-mono">TX: {w.txHash}</p>
                  )}
                </div>

                {w.status === 'PENDING' || w.status === 'PROCESSING' ? (
                  <div className="flex flex-col gap-2 min-w-48">
                    <input
                      type="text"
                      placeholder="TX hash (optional)"
                      value={txHash[w.id] ?? ''}
                      onChange={e => setTxHash(prev => ({ ...prev, [w.id]: e.target.value }))}
                      className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 placeholder-gray-600 font-mono"
                    />
                    <div className="flex gap-2">
                      {w.status === 'PENDING' && (
                        <button
                          onClick={() => update(w.id, 'PROCESSING')}
                          className="flex-1 px-2 py-1 text-xs bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 rounded hover:bg-yellow-900/60 transition-colors"
                        >
                          Mark Processing
                        </button>
                      )}
                      <button
                        onClick={() => update(w.id, 'COMPLETED')}
                        className="flex-1 px-2 py-1 text-xs bg-green-900/40 border border-green-700/40 text-green-300 rounded hover:bg-green-900/60 transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => update(w.id, 'FAILED')}
                        className="flex-1 px-2 py-1 text-xs bg-red-900/40 border border-red-700/40 text-red-300 rounded hover:bg-red-900/60 transition-colors"
                      >
                        Fail
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className={`px-2 py-1 text-xs rounded ${
                    w.status === 'COMPLETED' ? 'bg-green-900/40 text-green-400' :
                    'bg-red-900/40 text-red-400'
                  }`}>
                    {w.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
