'use client'

import Image from 'next/image'
import type { ItemVisualData } from '@/lib/item-visual-keys'

interface ItemSpriteProps {
  visual:       ItemVisualData | null | undefined
  /** Tamanho em px renderizado no layout (width = height) */
  size?:        number
  /** Fallback quando não há visual configurado */
  fallback?:    React.ReactNode
  className?:   string
  alt?:         string
}

/**
 * Renderiza o ícone estático de um item.
 * Usa `imageUrl` do visual; se ausente, mostra o fallback.
 */
export function ItemSprite({
  visual,
  size = 64,
  fallback,
  className = '',
  alt = 'item',
}: ItemSpriteProps) {
  const url = visual?.imageUrl

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        {fallback ?? <DefaultIcon size={size} />}
      </div>
    )
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image
        src={url}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-contain"
        unoptimized={url.startsWith('http')}  // não otimiza URLs externas
      />
    </div>
  )
}

// ─── Fallback genérico ────────────────────────────────────────────────────────

function DefaultIcon({ size }: { size: number }) {
  const s = Math.round(size * 0.5)
  return (
    <svg
      width={s} height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="text-gray-700"
    >
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <path d="M9 9h6M9 12h6M9 15h4"/>
    </svg>
  )
}
