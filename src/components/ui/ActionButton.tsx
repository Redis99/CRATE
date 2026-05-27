'use client'

import { type ButtonHTMLAttributes } from 'react'

// ─── Variantes de estilo ──────────────────────────────────────────────────────

export type ActionButtonVariant =
  | 'primary'       // indigo preenchido — ação principal
  | 'outline'       // indigo com borda — ação secundária
  | 'danger'        // vermelho com borda — destrutiva outline
  | 'danger-filled' // vermelho preenchido — destrutiva confirmada
  | 'ghost'         // neutro — cancelar/voltar
  | 'purple'        // roxo preenchido — lootboxes

export type ActionButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ActionButtonVariant, string> = {
  'primary':       'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white shadow-sm hover:shadow-indigo-500/25 hover:shadow-md',
  'outline':       'border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/60 disabled:opacity-40',
  'danger':        'border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 disabled:opacity-40',
  'danger-filled': 'bg-red-600 hover:bg-red-500 disabled:bg-red-600/30 text-white',
  'ghost':         'border text-gray-400 hover:text-gray-200 hover:border-white/20 disabled:opacity-40',
  'purple':        'bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/30 text-white shadow-sm hover:shadow-purple-500/25 hover:shadow-md',
}

const SIZE_CLASSES: Record<ActionButtonSize, string> = {
  'xs': 'text-xs px-2.5 py-1.5 rounded-md',
  'sm': 'text-xs px-3 py-1.5 rounded-lg',
  'md': 'text-sm px-4 py-2 rounded-lg',
  'lg': 'text-sm px-8 py-2.5 rounded-lg',
}

// Ghost border color comes from token
const GHOST_STYLE: React.CSSProperties = {
  borderColor: 'var(--border-strong)',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant
  size?: ActionButtonSize
  fullWidth?: boolean
  loading?: boolean
  loadingText?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActionButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText,
  disabled,
  children,
  className = '',
  style,
  ...props
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'font-medium transition-all duration-150 disabled:cursor-not-allowed active:scale-[0.98]',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={variant === 'ghost' ? { ...GHOST_STYLE, ...style } : style}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin"
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
          </svg>
          {loadingText ?? 'Loading…'}
        </span>
      ) : children}
    </button>
  )
}
