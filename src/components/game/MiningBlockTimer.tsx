'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const BLOCK_INTERVAL_MS = 15 * 60 * 1000 // 15 minutos
// Aguarda 10s após o bloco ser esperado antes de atualizar
// (dá tempo ao cron do Vercel de processar e gravar no banco)
const REFRESH_DELAY_MS = 10_000

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function MiningBlockTimer({ lastBlockAt }: { lastBlockAt: string | null }) {
  const router = useRouter()
  const [progress, setProgress]   = useState(0)
  const [remaining, setRemaining] = useState(BLOCK_INTERVAL_MS)
  const refreshedAt = useRef<number | null>(null) // evita refresh duplicado

  useEffect(() => {
    function tick() {
      if (!lastBlockAt) {
        setProgress(0)
        setRemaining(BLOCK_INTERVAL_MS)
        return
      }

      const lastBlock = new Date(lastBlockAt).getTime()
      const nextBlock = lastBlock + BLOCK_INTERVAL_MS
      const now       = Date.now()
      const elapsed   = now - lastBlock
      const timeLeft  = Math.max(0, nextBlock - now)

      setProgress(Math.min(100, (elapsed / BLOCK_INTERVAL_MS) * 100))
      setRemaining(timeLeft)

      // Quando o bloco deveria ter sido processado, aguarda REFRESH_DELAY_MS
      // e faz router.refresh() para buscar o novo lastBlockAt do servidor
      if (timeLeft === 0) {
        const expectedRefresh = nextBlock + REFRESH_DELAY_MS
        if (now >= expectedRefresh && refreshedAt.current !== nextBlock) {
          refreshedAt.current = nextBlock
          router.refresh()
        }
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lastBlockAt, router])

  const isReady = remaining === 0

  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-800/60">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-gray-500 text-xs">Next block</span>
        <span className={`text-xs font-mono ${isReady ? 'text-green-400 animate-pulse' : 'text-gray-400'}`}>
          {isReady ? 'Waiting for block...' : formatCountdown(remaining)}
        </span>
      </div>
      <div className="w-full bg-gray-800/80 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${
            isReady
              ? 'bg-green-400 animate-pulse'
              : progress > 75
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {!lastBlockAt && (
        <p className="text-gray-700 text-xs mt-1">Waiting for first block...</p>
      )}
    </div>
  )
}
