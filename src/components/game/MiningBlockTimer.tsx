'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const BLOCK_INTERVAL_MS = 15 * 60 * 1000  // 15 minutos
const FIRST_RETRY_MS    = 10_000          // aguarda 10s antes do 1º refresh
const POLL_INTERVAL_MS  = 20_000          // tenta novamente a cada 20s até receber novo bloco

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

  // Refs para controlar o polling sem causar re-renders extras
  const pollingRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const firstRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPolling    = useRef(false)

  function stopPolling() {
    if (pollingRef.current)    { clearInterval(pollingRef.current);  pollingRef.current = null }
    if (firstRetryRef.current) { clearTimeout(firstRetryRef.current); firstRetryRef.current = null }
    isPolling.current = false
  }

  function startPolling() {
    if (isPolling.current) return
    isPolling.current = true

    // Primeiro refresh após 10s (dá tempo ao cron processar e gravar)
    firstRetryRef.current = setTimeout(() => {
      router.refresh()
      // Se ainda não atualizou, continua tentando a cada 20s
      pollingRef.current = setInterval(() => {
        router.refresh()
      }, POLL_INTERVAL_MS)
    }, FIRST_RETRY_MS)
  }

  useEffect(() => {
    // Quando lastBlockAt muda (novo bloco chegou), para o polling
    stopPolling()

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

      // Bloco atrasado → começa a tentar buscar o novo
      if (timeLeft === 0) startPolling()
    }

    tick()
    const interval = setInterval(tick, 1000)

    return () => {
      clearInterval(interval)
      stopPolling()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBlockAt])

  const isOverdue = remaining === 0

  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-800/60">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-gray-500 text-xs">Next block</span>
        <span className={`text-xs font-mono ${isOverdue ? 'text-green-400 animate-pulse' : 'text-gray-400'}`}>
          {isOverdue ? 'Waiting for block...' : formatCountdown(remaining)}
        </span>
      </div>
      <div className="w-full bg-gray-800/80 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${
            isOverdue ? 'bg-green-400 animate-pulse' : remaining < 3 * 60 * 1000 ? 'bg-yellow-500' : 'bg-blue-500'
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
