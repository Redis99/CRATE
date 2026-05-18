'use client'

import { useEffect, useState } from 'react'

interface Player {
  id: string
  username: string
  email: string
  createdAt: string
  balanceCrate: number
  balanceSol: number
  balanceLc: number
  isBanned: boolean
  isAdmin: boolean
  _count: { robots: number; transactions: number }
}

interface Pagination {
  players: Player[]
  total: number
  page: number
  pages: number
}

export default function PlayersAdminPage() {
  const [data, setData]         = useState<Pagination | null>(null)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [msg, setMsg]           = useState('')
  const [airdrop, setAirdrop]   = useState<{ id: string; amount: string; token: string; note: string } | null>(null)
  const [notif, setNotif]       = useState<{ id: string; msg: string } | null>(null)

  async function load(q: string, p: number) {
    setLoading(true)
    const r = await fetch(`/api/admin/players?q=${encodeURIComponent(q)}&page=${p}`)
    setData(await r.json())
    setLoading(false)
  }

  useEffect(() => { load(search, page) }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load(search, 1)
  }

  async function doAction(id: string, action: 'ban' | 'unban') {
    if (!confirm(`${action === 'ban' ? 'Ban' : 'Unban'} this player?`)) return
    setMsg(`${action}ning…`)
    await fetch('/api/admin/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setMsg(`Done: ${action}`)
    load(search, page)
  }

  async function sendAirdrop() {
    if (!airdrop) return
    const amount = parseFloat(airdrop.amount)
    if (isNaN(amount) || amount <= 0) { setMsg('Invalid amount'); return }
    setMsg('Sending airdrop…')
    const r = await fetch('/api/admin/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: airdrop.id,
        action: 'airdrop',
        amount,
        token: airdrop.token,
        note: airdrop.note || undefined,
      }),
    })
    if (r.ok) {
      setMsg('Airdrop sent!')
      setAirdrop(null)
      load(search, page)
    } else {
      setMsg('Error sending airdrop')
    }
  }

  async function sendNotification() {
    if (!notif) return
    setMsg('Sending…')
    const r = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: notif.id, message: notif.msg }),
    })
    if (r.ok) { setMsg('Notification sent!'); setNotif(null) }
    else setMsg('Error')
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-purple-300 font-mono">Players</h1>
        {data && <span className="text-xs text-gray-500">{data.total} total</span>}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search username or email…"
          className="flex-1 input-admin"
        />
        <button type="submit"
          className="px-3 py-1.5 text-xs bg-purple-800/50 border border-purple-700 text-purple-200 rounded">
          Search
        </button>
      </form>

      {msg && <p className="text-xs text-yellow-400 font-mono">{msg}</p>}

      {/* Airdrop Modal */}
      {airdrop && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-80 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">Airdrop</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500">Amount</label>
                <input type="number" value={airdrop.amount}
                  onChange={e => setAirdrop(p => p && ({ ...p, amount: e.target.value }))}
                  className="w-full input-admin mt-1" step="0.001" min="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Token</label>
                <select value={airdrop.token}
                  onChange={e => setAirdrop(p => p && ({ ...p, token: e.target.value }))}
                  className="w-full input-admin mt-1">
                  <option>CRATE</option>
                  <option>SOL</option>
                  <option>LC</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Note (optional)</label>
                <input type="text" value={airdrop.note}
                  onChange={e => setAirdrop(p => p && ({ ...p, note: e.target.value }))}
                  className="w-full input-admin mt-1" placeholder="Reason…" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={sendAirdrop}
                className="flex-1 px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded">
                Send
              </button>
              <button onClick={() => setAirdrop(null)}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notif && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d1a] border border-purple-800/50 rounded-lg p-5 w-80 space-y-3">
            <h2 className="text-sm font-bold text-purple-300">Send Notification</h2>
            <textarea
              value={notif.msg}
              onChange={e => setNotif(p => p && ({ ...p, msg: e.target.value }))}
              rows={3}
              placeholder="Message…"
              className="w-full input-admin"
            />
            <div className="flex gap-2">
              <button onClick={sendNotification}
                className="flex-1 px-3 py-1.5 text-xs bg-purple-800/60 border border-purple-600 text-purple-200 rounded">
                Send
              </button>
              <button onClick={() => setNotif(null)}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          <div className="space-y-2">
            {data?.players.map(p => (
              <div key={p.id}
                className={`bg-[#0d0d1a] border rounded-lg p-3 ${
                  p.isBanned ? 'border-red-900/40 opacity-70' : 'border-purple-900/20'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-200">{p.username}</span>
                      {p.isAdmin && <span className="text-xs bg-purple-900/40 text-purple-300 px-1.5 rounded">Admin</span>}
                      {p.isBanned && <span className="text-xs bg-red-900/40 text-red-400 px-1.5 rounded">Banned</span>}
                    </div>
                    <p className="text-xs text-gray-500">{p.email}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      <span className="text-purple-300">{p.balanceCrate.toFixed(2)} CRATE</span>
                      <span>{p.balanceSol.toFixed(4)} SOL</span>
                      <span>{p.balanceLc.toFixed(4)} LC</span>
                      <span>·</span>
                      <span>{p._count.robots} robots</span>
                      <span>{p._count.transactions} txs</span>
                      <span>·</span>
                      <span>Joined {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setAirdrop({ id: p.id, amount: '', token: 'CRATE', note: '' })}
                      className="px-2 py-1 text-xs border border-purple-700/40 text-purple-400 rounded hover:bg-purple-900/20">
                      Airdrop
                    </button>
                    <button
                      onClick={() => setNotif({ id: p.id, msg: '' })}
                      className="px-2 py-1 text-xs border border-gray-700 text-gray-400 rounded hover:bg-gray-800">
                      Notify
                    </button>
                    <button
                      onClick={() => doAction(p.id, p.isBanned ? 'unban' : 'ban')}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        p.isBanned
                          ? 'border-green-700/40 text-green-400 hover:bg-green-900/20'
                          : 'border-red-700/40 text-red-400 hover:bg-red-900/20'
                      }`}>
                      {p.isBanned ? 'Unban' : 'Ban'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button disabled={page === 1}
                onClick={() => { setPage(p => p - 1); load(search, page - 1) }}
                className="px-3 py-1 text-xs border border-gray-700 text-gray-400 rounded disabled:opacity-30">
                ← Prev
              </button>
              <span className="text-xs text-gray-500 self-center">{page} / {data.pages}</span>
              <button disabled={page === data.pages}
                onClick={() => { setPage(p => p + 1); load(search, page + 1) }}
                className="px-3 py-1 text-xs border border-gray-700 text-gray-400 rounded disabled:opacity-30">
                Next →
              </button>
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        .input-admin {
          background: #111122;
          border: 1px solid #2d2d50;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          color: #d1d5db;
          outline: none;
        }
        .input-admin:focus { border-color: #7c3aed; }
      `}</style>
    </div>
  )
}
