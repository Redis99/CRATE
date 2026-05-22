'use client'

import { ActionButton } from '@/components/ui/ActionButton'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodexCollectionEntry {
  id:           string
  itemName:     string
  rarity:       string
  registeredAt: string
}

export interface CodexAvailableRobot {
  id:        string
  name:      string
  collection: string
  rarity:    string
  hashPower: number
}

export interface CodexCollectionSlot {
  name:   string
  filled: boolean
  entry:  CodexCollectionEntry | null
}

export interface CodexCollectionData {
  id:                string
  name:              string
  description:       string
  itemType:          string
  totalRequired:     number
  requiredItems:     string[]       // nomes específicos (álbum de figurinhas). [] = modo genérico
  bonusPerItemErPct: number
  completionErPct:   number
  completionPdPct:   number
  completionSlots:   number
  active:            boolean
  sortOrder:         number
  // Campos de progresso — presentes quando carregado pelo jogador
  registeredCount?:  number
  registeredItems?:  CodexCollectionEntry[]
  availableRobots?:  CodexAvailableRobot[]
  isComplete?:       boolean
  slots?:            CodexCollectionSlot[] | null  // null = modo genérico
}

interface CodexCollectionCardProps {
  collection: CodexCollectionData
  onRegister?: (collection: CodexCollectionData) => void  // game UI — registrar robô
  onEdit?:     (collection: CodexCollectionData) => void  // admin UI — editar coleção
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  COMMON:    'text-gray-300',
  UNCOMMON:  'text-green-400',
  RARE:      'text-blue-400',
  EPIC:      'text-purple-400',
  LEGENDARY: 'text-yellow-400',
}

const RARITY_BORDER: Record<string, string> = {
  COMMON:    'border-gray-600/40',
  UNCOMMON:  'border-green-500/30',
  RARE:      'border-blue-500/30',
  EPIC:      'border-purple-500/30',
  LEGENDARY: 'border-yellow-500/40',
}

function ProgressBar({ current, total, complete }: { current: number; total: number; complete: boolean }) {
  const pct = Math.min((current / total) * 100, 100)
  return (
    <div className="w-full bg-gray-800/60 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-yellow-400' : 'bg-blue-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function CodexCollectionCard({ collection, onRegister, onEdit }: CodexCollectionCardProps) {
  const registered   = collection.registeredCount ?? 0
  const isComplete   = collection.isComplete ?? false
  const canRegister  = onRegister && (collection.availableRobots?.length ?? 0) > 0 && !isComplete
  const hasProgress  = collection.registeredCount !== undefined

  return (
    <div className={`bg-[#0d0d15] border rounded-xl p-4 flex flex-col gap-3 transition-all ${
      isComplete ? 'border-yellow-500/30' : 'border-gray-700/50'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-white text-sm font-semibold truncate">{collection.name}</p>
            {isComplete && (
              <span className="shrink-0 text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5 font-medium">
                COMPLETE
              </span>
            )}
            {!collection.active && (
              <span className="shrink-0 text-[10px] bg-gray-700/40 text-gray-500 border border-gray-700/40 rounded-full px-2 py-0.5">
                INACTIVE
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{collection.description}</p>
        </div>

        {/* Progress counter ou admin edit */}
        <div className="shrink-0 flex items-start gap-2">
          {hasProgress && (
            <p className={`text-lg font-bold tabular-nums ${isComplete ? 'text-yellow-400' : 'text-white'}`}>
              {registered}
              <span className="text-gray-600 text-sm font-normal">/{collection.totalRequired}</span>
            </p>
          )}
          {!hasProgress && (
            <p className="text-gray-500 text-sm tabular-nums">
              {collection.totalRequired}
              <span className="text-gray-700 text-xs ml-0.5">req</span>
            </p>
          )}
        </div>
      </div>

      {/* Slots nominais (álbum de figurinhas) ou progress bar genérico */}
      {hasProgress && collection.slots ? (
        <div className="grid grid-cols-2 gap-1.5">
          {collection.slots.map((slot) => (
            <div
              key={slot.name}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 border text-xs transition-all ${
                slot.filled
                  ? `${RARITY_BORDER[slot.entry?.rarity ?? ''] ?? 'border-green-500/30'} bg-green-500/5`
                  : 'border-gray-700/30 bg-gray-900/30'
              }`}
            >
              <span className={`shrink-0 text-[10px] font-bold ${slot.filled ? 'text-green-400' : 'text-gray-600'}`}>
                {slot.filled ? '✓' : '○'}
              </span>
              <span className={`truncate ${slot.filled ? 'text-white' : 'text-gray-600'}`}>
                {slot.name}
              </span>
            </div>
          ))}
        </div>
      ) : hasProgress && (
        <ProgressBar current={registered} total={collection.totalRequired} complete={isComplete} />
      )}

      {/* Bonuses */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {collection.bonusPerItemErPct > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <p className="text-gray-500 mb-0.5">Per robot</p>
            <p className="text-blue-400 font-semibold">+{collection.bonusPerItemErPct}% ER</p>
          </div>
        )}
        {(collection.completionErPct > 0 || collection.completionPdPct > 0 || collection.completionSlots > 0) && (
          <div className={`rounded-lg px-3 py-2 border ${
            isComplete
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-gray-800/40 border-gray-700/30'
          }`}>
            <p className={`mb-0.5 ${isComplete ? 'text-yellow-600' : 'text-gray-500'}`}>On complete</p>
            <div className={`font-semibold space-y-0.5 ${isComplete ? 'text-yellow-400' : 'text-gray-400'}`}>
              {collection.completionErPct  > 0 && <p>+{collection.completionErPct}% ER</p>}
              {collection.completionPdPct  > 0 && <p>-{collection.completionPdPct}% PD</p>}
              {collection.completionSlots  > 0 && <p>+{collection.completionSlots} slot{collection.completionSlots > 1 ? 's' : ''}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto">
        {canRegister && (
          <ActionButton
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => onRegister(collection)}
          >
            Register Robot ({collection.availableRobots!.length} available)
          </ActionButton>
        )}

        {!canRegister && !isComplete && onRegister && (
          <p className="text-gray-600 text-xs text-center py-1">
            Obtain more robots from this collection to register
          </p>
        )}

        {isComplete && onRegister && (
          <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm py-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Collection complete
          </div>
        )}

        {onEdit && (
          <ActionButton
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => onEdit(collection)}
          >
            Edit Collection
          </ActionButton>
        )}
      </div>
    </div>
  )
}
