'use client'

import { type ButtonHTMLAttributes } from 'react'

// ─── Variantes de estilo ──────────────────────────────────────────────────────

export type ActionButtonVariant =
  | 'primary'       // indigo preenchido — ação principal (Confirm, Save, Deploy)
  | 'outline'       // indigo com borda — ação secundária (Equip, Buy, Apply)
  | 'danger'        // vermelho com borda — ação destrutiva outline (Recall, Remove)
  | 'danger-filled' // vermelho preenchido — ação destrutiva confirmada (Destroy)
  | 'ghost'         // neutro — cancelar/voltar
  | 'purple'        // roxo preenchido — lootboxes (Open, Collect)

export type ActionButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ActionButtonVariant, string> = {
  'primary':       'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white',
  'outline':       'border border-indigo-600/40 text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-40',
  'danger':        'border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40',
  'danger-filled': 'bg-red-600 hover:bg-red-500 disabled:bg-red-600/40 text-white',
  'ghost':         'border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 disabled:opacity-40',
  'purple':        'bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/40 text-white',
}

const SIZE_CLASSES: Record<ActionButtonSize, string> = {
  'xs': 'text-xs px-2.5 py-1.5',
  'sm': 'text-xs px-3 py-1.5',
  'md': 'text-sm px-4 py-2',
  'lg': 'text-sm px-8 py-2.5',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionButtonVariant
  size?: ActionButtonSize
  fullWidth?: boolean
  loading?: boolean
  loadingText?: string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ActionButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText,
  disabled,
  children,
  className = '',
  ...props
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (loadingText ?? '...') : children}
    </button>
  )
}
