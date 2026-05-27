'use client'

import { RarityBadge } from '@/components/ui/RarityBadge'
import { RARITY_CARD_COLOR } from '@/lib/rarity'
import { RobotCard } from '@/components/game/RobotCard'
import type { RobotCardData } from '@/components/game/RobotCard'
import { ActionButton } from '@/components/ui/ActionButton'

interface Props {
  slot: number
  robot?: RobotCardData
  /** true quando há robô selecionado e este slot está vazio */
  isClickable: boolean
  /** id do robô em ação (deploy/recall) — para spinner */
  actionLoading: string | null
  onDeploy: () => void
  onRecall: (robot: RobotCardData) => void
  /** classe customizada do wrapper (skin sazonal) */
  className?: string
}

/**
 * Um único slot do outpost. Estado:
 * - Vazio + clicável → recebe deploy
 * - Vazio + não clicável → placeholder cinza
 * - Ocupado → RobotCard variante 'outpost' com botão Recall
 *
 * Para temas sazonais, criar OutpostSlotHalloween, OutpostSlotChristmas etc.
 * e trocar no SlotsGrid via prop ou nova versão do layout.
 */
export function OutpostSlot({
  slot, robot, isClickable, actionLoading, onDeploy, onRecall, className,
}: Props) {
  const baseClass = robot
    ? `${RARITY_CARD_COLOR[robot.rarity]} border`
    : isClickable
    ? 'border-blue-500/60 bg-blue-500/10 cursor-pointer hover:border-blue-400'
    : 'border-gray-800/60 bg-[#0d0d15]'

  return (
    <div
      onClick={() => isClickable && onDeploy()}
      className={className ?? `border rounded-xl p-4 transition-all ${baseClass}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-xs">Slot {slot}</span>
        {robot && <RarityBadge rarity={robot.rarity} />}
      </div>

      {robot ? (
        <RobotCard
          robot={robot}
          variant="outpost"
          slotNumber={slot}
          actions={
            <ActionButton
              variant="danger"
              size="sm"
              fullWidth
              onClick={(e) => { e.stopPropagation(); onRecall(robot) }}
              disabled={actionLoading === robot.id}
              loading={actionLoading === robot.id}
              loadingText="Recalling..."
            >
              Recall
            </ActionButton>
          }
        />
      ) : (
        <EmptySlotContent isClickable={isClickable} />
      )}
    </div>
  )
}

function EmptySlotContent({ isClickable }: { isClickable: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 gap-1">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isClickable ? 2 : 1.5}
        className={isClickable ? 'text-blue-400' : 'text-gray-700'}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <span className={`text-xs ${isClickable ? 'text-blue-400' : 'text-gray-700'}`}>
        {isClickable ? 'Deploy here' : 'Empty'}
      </span>
    </div>
  )
}
