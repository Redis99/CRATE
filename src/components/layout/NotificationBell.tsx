'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Notification {
  id:        string
  title:     string
  message:   string
  read:      boolean
  createdAt: string
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function NotificationBell() {
  const [open,       setOpen]       = useState(false)
  const [items,      setItems]      = useState<Notification[]>([])
  const [unread,     setUnread]     = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/game/notifications')
    if (res.ok) {
      const json = await res.json()
      setItems(json.notifications ?? [])
      setUnread(json.unreadCount ?? 0)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll a cada 60s para novidades
    const id = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!open && unread > 0) {
      // Marca como lidas ao abrir
      await fetch('/api/game/notifications', { method: 'PATCH' })
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
        title="Notifications"
      >
        {/* Ícone de sino */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Badge de não-lidas */}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-full ml-2 top-0 w-72 bg-[#111118] border border-gray-800/60 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800/40 flex items-center justify-between">
            <p className="text-white text-sm font-semibold">Notifications</p>
            <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-8">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-800/20 last:border-0 ${
                    !n.read ? 'bg-blue-500/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-medium ${!n.read ? 'text-white' : 'text-gray-400'}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1" />}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-gray-700 text-xs mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
