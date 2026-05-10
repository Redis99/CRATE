'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RechargeAllButton() {
  const router = useRouter()
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ message: string; ok: boolean } | null>(null)

  async function handleRecharge() {
    setLoading(true); setResult(null)
    const res  = await fetch('/api/game/outpost/recharge-all', { method: 'POST' })
    const json = await res.json()
    setResult({ message: json.message ?? json.error ?? 'Unknown error.', ok: res.ok })
    if (res.ok) router.refresh()
    setLoading(false)
    // Limpa o feedback após 4s
    setTimeout(() => setResult(null), 4000)
  }

  return (
    <div>
      <button
        onClick={handleRecharge}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-teal-600/40 text-teal-400 hover:bg-teal-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Recharging...
          </>
        ) : (
          <>
            🔋 Recharge All
          </>
        )}
      </button>
      {result && (
        <p className={`text-xs mt-1 ${result.ok ? 'text-teal-400' : 'text-red-400'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
