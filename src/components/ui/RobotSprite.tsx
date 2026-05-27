'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { ItemVisualData } from '@/lib/item-visual-keys'

export type RobotState = 'idle' | 'active' | 'low'

interface RobotSpriteProps {
  visual:     ItemVisualData | null | undefined
  state?:     RobotState
  /** Tamanho em px do quadrado renderizado */
  size?:      number
  className?: string
  alt?:       string
}

/**
 * Renderiza o sprite animado de um robô.
 *
 * Lógica de resolução:
 *   - state='active' → spriteActiveUrl  → spriteIdleUrl   → imageUrl
 *   - state='low'    → spriteLowUrl     → spriteIdleUrl   → imageUrl
 *   - state='idle'   → spriteIdleUrl    → imageUrl
 *
 * Quando a URL apontada é um sprite sheet (frameCount > 1), usa canvas
 * para animar frame por frame. Caso contrário, usa <Image> estático.
 */
export function RobotSprite({
  visual,
  state = 'idle',
  size = 64,
  className = '',
  alt = 'robot',
}: RobotSpriteProps) {
  // Resolve a URL do sprite de acordo com o estado
  const spriteUrl = resolveStateUrl(visual, state)

  const isAnimated = !!spriteUrl && (visual?.frameCount ?? 1) > 1

  if (!spriteUrl) {
    return <RobotPlaceholder size={size} className={className} />
  }

  if (isAnimated) {
    return (
      <AnimatedSprite
        url={spriteUrl}
        frameWidth={visual!.frameWidth}
        frameHeight={visual!.frameHeight}
        frameCount={visual!.frameCount}
        fps={visual!.fps}
        displaySize={size}
        className={className}
        alt={alt}
      />
    )
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image
        src={spriteUrl}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-contain"
        unoptimized={spriteUrl.startsWith('http')}
      />
    </div>
  )
}

// ─── Resolve state → URL ──────────────────────────────────────────────────────

function resolveStateUrl(
  visual: ItemVisualData | null | undefined,
  state: RobotState,
): string | null {
  if (!visual) return null
  if (state === 'active') {
    return visual.spriteActiveUrl ?? visual.spriteIdleUrl ?? visual.imageUrl
  }
  if (state === 'low') {
    return visual.spriteLowUrl ?? visual.spriteIdleUrl ?? visual.imageUrl
  }
  return visual.spriteIdleUrl ?? visual.imageUrl
}

// ─── Canvas animado ───────────────────────────────────────────────────────────

interface AnimatedSpriteProps {
  url:         string
  frameWidth:  number
  frameHeight: number
  frameCount:  number
  fps:         number
  displaySize: number
  className?:  string
  alt:         string
}

function AnimatedSprite({
  url, frameWidth, frameHeight, frameCount, fps, displaySize, className = '',
}: AnimatedSpriteProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const imgRef     = useRef<HTMLImageElement | null>(null)
  const frameRef   = useRef(0)
  const rafRef     = useRef<number>(0)
  const lastRef    = useRef(0)
  const intervalMs = 1000 / Math.max(1, fps)

  useEffect(() => {
    const img = new window.Image()
    img.src = url
    img.crossOrigin = 'anonymous'
    imgRef.current = img

    function draw(timestamp: number) {
      if (timestamp - lastRef.current >= intervalMs) {
        lastRef.current = timestamp
        frameRef.current = (frameRef.current + 1) % frameCount

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx || !imgRef.current) return

        ctx.clearRect(0, 0, displaySize, displaySize)
        ctx.drawImage(
          imgRef.current,
          frameRef.current * frameWidth, 0,  // source x, y
          frameWidth, frameHeight,            // source w, h
          0, 0,                               // dest x, y
          displaySize, displaySize,           // dest w, h
        )
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    img.onload = () => {
      rafRef.current = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [url, frameWidth, frameHeight, frameCount, fps, displaySize, intervalMs])

  return (
    <canvas
      ref={canvasRef}
      width={displaySize}
      height={displaySize}
      className={`flex-shrink-0 ${className}`}
    />
  )
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

function RobotPlaceholder({ size, className = '' }: { size: number; className?: string }) {
  const s = Math.round(size * 0.6)
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gray-800/40 border border-gray-700/30 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Simple robot icon */}
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-600">
        <rect x="7" y="9" width="10" height="8" rx="2"/>
        <path d="M12 9V7M9 7h6M9 13h.01M15 13h.01M9 16h6"/>
        <circle cx="12" cy="5" r="1"/>
      </svg>
    </div>
  )
}
