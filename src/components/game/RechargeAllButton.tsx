'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionButton } from '@/components/ui/ActionButton'

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
      <ActionButton
        variant="outline"
        size="sm"
        onClick={handleRecharge}
        disabled={loading}
        loading={loading}
        loadingText="Recharging..."
      >
        🔋 Recharge All
      </ActionButton>
      {result && (
        <p className={`text-xs mt-1 ${result.ok ? 'text-teal-400' : 'text-red-400'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
