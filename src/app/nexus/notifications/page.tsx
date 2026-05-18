'use client'

import { useState } from 'react'

export default function NotificationsAdminPage() {
  const [broadcast, setBroadcast] = useState(false)
  const [userId, setUserId]       = useState('')
  const [message, setMessage]     = useState('')
  const [result, setResult]       = useState('')

  async function send() {
    if (!message.trim()) { setResult('Message required'); return }
    if (!broadcast && !userId.trim()) { setResult('User ID required for targeted notification'); return }

    setResult('Sending…')
    const r = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        broadcast,
        userId: broadcast ? undefined : userId,
        message,
      }),
    })
    const data = await r.json()
    if (r.ok) {
      setResult(broadcast ? `Sent to ${data.sent} players` : 'Notification sent!')
      setMessage('')
      setUserId('')
    } else {
      setResult(`Error: ${data.error}`)
    }
  }

  return (
    <div className="p-6 max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-purple-300 font-mono">Send Notification</h1>

      <div className="bg-[#0d0d1a] border border-purple-900/30 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={broadcast}
              onChange={e => setBroadcast(e.target.checked)}
              className="accent-purple-500"
            />
            <span className="text-sm text-gray-300">Broadcast to all players</span>
          </label>
        </div>

        {!broadcast && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Player User ID</label>
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="UUID from players page…"
              className="w-full input-admin font-mono"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="Notification message…"
            className="w-full input-admin"
          />
        </div>

        <button
          onClick={send}
          className="w-full px-4 py-2 text-sm bg-purple-800/60 border border-purple-600 text-purple-200 rounded hover:bg-purple-700/60 transition-colors"
        >
          {broadcast ? 'Broadcast to All' : 'Send to Player'}
        </button>

        {result && (
          <p className={`text-xs font-mono ${result.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {result}
          </p>
        )}
      </div>

      <style jsx global>{`
        .input-admin {
          background: #111122;
          border: 1px solid #2d2d50;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 13px;
          color: #d1d5db;
          outline: none;
          resize: vertical;
        }
        .input-admin:focus { border-color: #7c3aed; }
      `}</style>
    </div>
  )
}
