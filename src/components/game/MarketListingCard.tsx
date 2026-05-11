'use client'

import { RarityBadge } from '@/components/ui/RarityBadge'
import { ActionButton } from '@/components/ui/ActionButton'
import { CategoryTag } from '@/components/game/CategoryTag'
import type { Rarity } from '@/lib/rarity'

// ─── Tipos do item listado ────────────────────────────────────────────────────

interface MarketRobot {
  id: string; name: string; collection: string; rarity: string
  hashPower: number; energyRate: number; durability: number
  equipments?: Array<{ equipment: { id: string; name: string; effectType: string; effectValue: number } }>
}
interface MarketEquipment {
  id: string; name: string; rarity: string
  effectType: string; effectValue: number
  effectType2?: string | null; effectValue2?: number | null
}
interface MarketBaseUpgrade {
  id: string; name: string; rarity: string
  effectType: string; effectValue: number
  effectType2?: string | null; effectValue2?: number | null
}

export interface MarketListing {
  id:          string
  sellerId:    string
  price:       number
  expiresAt:   string
  itemType:    'ROBOT' | 'EQUIPMENT' | 'BASE_UPGRADE'
  seller?:     { username: string }
  robot?:      MarketRobot | null
  equipment?:  MarketEquipment | null
  baseUpgrade?: MarketBaseUpgrade | null
}

interface MarketListingCardProps {
  listing:   MarketListing
  isOwn:     boolean
  buying:    boolean
  cancelling: boolean
  onBuy:    (id: string) => void
  onCancel: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeRemaining(expiresAt: string): string {
  const ms   = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const days = Math.floor(ms / 86400000)
  const hrs  = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hrs}h`
  const min = Math.floor((ms % 3600000) / 60000)
  return hrs > 0 ? `${hrs}h ${min}m` : `${min}m`
}

function effectLabel(effectType: string, effectValue: number): string {
  const labels: Record<string, string> = {
    HASH_POWER_FLAT: 'ER +', HASH_POWER_PCT: 'ER +',
    POWER_DRAW_FLAT: 'PD -', POWER_DRAW_PCT: 'PD -',
    GLOBAL_EFFICIENCY_PCT: 'Efficiency +', DURABILITY_LOSS_PCT: 'PD -',
    UPTIME_HOURS: 'Uptime +',
  }
  const suffix = effectType.includes('PCT') ? '%' : effectType === 'UPTIME_HOURS' ? 'h' : ''
  return `${labels[effectType] ?? ''}${effectValue}${suffix}`
}

// ─── Item preview ─────────────────────────────────────────────────────────────

function ItemPreview({ listing }: { listing: MarketListing }) {
  if (listing.robot) {
    const r = listing.robot
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <RarityBadge rarity={r.rarity as Rarity} />
          <span className="text-white text-sm font-semibold truncate">{r.name}</span>
        </div>
        <p className="text-gray-500 text-xs truncate mb-1">{r.collection}</p>
        <div className="flex gap-3 text-xs">
          <span className="text-orange-400">{r.hashPower} ER</span>
          <span className="text-teal-400">{r.energyRate} PD/hr</span>
          <span className={r.durability > 50 ? 'text-green-400' : 'text-yellow-400'}>{r.durability.toFixed(0)}% energy</span>
        </div>
        {(r.equipments?.length ?? 0) > 0 && (
          <p className="text-gray-600 text-xs mt-1">+ {r.equipments!.length} equipment(s) included</p>
        )}
      </div>
    )
  }

  const item = listing.equipment ?? listing.baseUpgrade
  if (!item) return null
  const type = listing.equipment ? 'Equipment' : 'Base Upgrade'

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <RarityBadge rarity={item.rarity as Rarity} />
        <span className="text-xs text-gray-400">{type}</span>
      </div>
      <p className="text-white text-sm font-semibold truncate mb-1">{item.name}</p>
      <div className="flex gap-1.5 flex-wrap">
        <CategoryTag effectType={item.effectType} />
        {item.effectType2 && <CategoryTag effectType={item.effectType2} />}
        <span className="text-gray-500 text-xs">{effectLabel(item.effectType, item.effectValue)}</span>
        {item.effectType2 && item.effectValue2 && (
          <span className="text-gray-500 text-xs">· {effectLabel(item.effectType2, item.effectValue2)}</span>
        )}
      </div>
    </div>
  )
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export function MarketListingCard({
  listing, isOwn, buying, cancelling, onBuy, onCancel,
}: MarketListingCardProps) {
  return (
    <div className={`border rounded-xl p-4 bg-[#0d0d15] flex flex-col gap-3 ${
      isOwn ? 'border-blue-700/30' : 'border-gray-700/50'
    }`}>
      <ItemPreview listing={listing} />

      {/* Footer: seller, price, time */}
      <div className="flex items-end justify-between pt-2 border-t border-gray-800/60">
        <div>
          <p className="text-white font-bold font-mono">{listing.price} CRATE</p>
          <p className="text-gray-600 text-xs mt-0.5">
            {isOwn ? 'Your listing' : `by ${listing.seller?.username ?? '—'}`}
            {' · '}{timeRemaining(listing.expiresAt)}
          </p>
        </div>
        {isOwn ? (
          <ActionButton variant="danger" size="sm" loading={cancelling} loadingText="..." onClick={() => onCancel(listing.id)}>
            Cancel
          </ActionButton>
        ) : (
          <ActionButton variant="outline" size="sm" loading={buying} loadingText="Buying..." onClick={() => onBuy(listing.id)}>
            Buy
          </ActionButton>
        )}
      </div>
    </div>
  )
}
