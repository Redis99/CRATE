'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DropResultType } from '@/lib/lootbox'
import { LootboxDropModal } from '@/components/game/LootboxDropModal'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { ActionButton } from '@/components/ui/ActionButton'

interface LootboxData {
  balance: number
  partsCrates:  { owned: number }
  supplyCrates: { owned: number }
  weeklyPartsPurchased: number
  weeklyPartsLimit: number
  prices: { partsCrate: number; supplyCrate: number }
}

// ─── Drop tables (display only) ───────────────────────────────────────────────

const PARTS_DROPS = [
  { label: 'Common Parts ×4',    chance: '35%'  },
  { label: 'Common Parts ×8',    chance: '25%'  },
  { label: 'Uncommon Parts ×2',  chance: '18%'  },
  { label: 'Uncommon Parts ×4',  chance: '12%'  },
  { label: 'Rare Part ×1',       chance: '5%'   },
  { label: 'Rare Parts ×2',      chance: '3%'   },
  { label: 'Epic Part ×1',       chance: '2%'   },
]

const SUPPLY_DROPS = [
  { label: 'Common Equipment',        chance: '18%'  },
  { label: 'Common Base Upgrade',     chance: '15%'  },
  { label: 'Repair Kit ×5',           chance: '12%'  },
  { label: 'Common Robot',            chance: '12%'  },
  { label: 'Uncommon Equipment',      chance: '9%'   },
  { label: 'Uncommon Base Upgrade',   chance: '8%'   },
  { label: 'Uncommon Robot',          chance: '7%'   },
  { label: 'Rare Equipment',          chance: '5%'   },
  { label: 'Rare Base Upgrade',       chance: '4%'   },
  { label: 'Rare Robot',              chance: '4%'   },
  { label: 'Epic Equipment',          chance: '2%'   },
  { label: 'Epic Base Upgrade',       chance: '2%'   },
  { label: 'Epic Robot',              chance: '1%'   },
  { label: 'Legendary Equipment',     chance: '0.5%' },
  { label: 'Legendary Base Upgrade',  chance: '0.3%' },
  { label: 'Legendary Robot',         chance: '0.2%' },
]

// ─── Crate Card ───────────────────────────────────────────────────────────────

function CrateCard({
  title, description, price, owned,
  buyQty, openQty, maxBuy, maxOpen,
  badge, badgeColor, dropTableRows,
  canBuy, onBuyQtyChange, onOpenQtyChange,
  onBuy, onOpen, loading,
}: {
  title: string; description: string; price: number; owned: number
  buyQty: number; openQty: number; maxBuy: number; maxOpen: number
  badge?: string; badgeColor?: string
  dropTableRows: { label: string; chance: string }[]
  canBuy: boolean
  onBuyQtyChange: (v: number) => void; onOpenQtyChange: (v: number) => void
  onBuy: () => void; onOpen: () => void; loading: boolean
}) {
  const [showDrops, setShowDrops] = useState(false)
  const totalBuyCost = price * buyQty

  return (
    <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold">{title}</h3>
            {badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded border ${badgeColor}`}>{badge}</span>
            )}
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <p className="text-gray-500 text-xs">per crate</p>
          <p className="text-white font-bold font-mono">{price} CRATE</p>
          {owned > 0 && <p className="text-green-400 text-xs mt-0.5">Owned: {owned}</p>}
        </div>
      </div>

      {/* Drop table */}
      <button
        onClick={() => setShowDrops((v) => !v)}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors mb-3 flex items-center gap-1"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform ${showDrops ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {showDrops ? 'Hide' : 'View'} drop table
      </button>

      {showDrops && (
        <div className="mb-3 bg-[#0d0d15] rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
          {dropTableRows.map((row, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-400">{row.label}</span>
              <span className="text-gray-600 font-mono">{row.chance}</span>
            </div>
          ))}
        </div>
      )}

      {/* Buy section */}
      <div className="border-t border-gray-800/40 pt-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-xs">Buy quantity</span>
          <QuantityStepper value={buyQty} min={1} max={maxBuy} onChange={onBuyQtyChange} />
        </div>
        <ActionButton
          variant="outline"
          fullWidth
          onClick={onBuy}
          disabled={!canBuy || loading}
          loading={loading}
        >
          {`Buy ${buyQty}× — ${totalBuyCost.toFixed(2)} CRATE`}
        </ActionButton>
      </div>

      {/* Open section */}
      {owned > 0 && (
        <div className="border-t border-gray-800/40 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-xs">Open quantity</span>
            <QuantityStepper value={openQty} min={1} max={Math.min(maxOpen, owned)} onChange={onOpenQtyChange} />
          </div>
          <button
            onClick={onOpen}
            disabled={loading}
            className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Opening...' : `Open ${openQty}× ${title}`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LootboxManager() {
  const [data, setData]     = useState<LootboxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState('')
  const [drops, setDrops]   = useState<DropResultType[] | null>(null)
  const [stoppedEarly, setStoppedEarly] = useState(false)

  const [partsBuyQty,   setPartsBuyQty]   = useState(1)
  const [supplyBuyQty,  setSupplyBuyQty]  = useState(1)
  const [partsOpenQty,  setPartsOpenQty]  = useState(1)
  const [supplyOpenQty, setSupplyOpenQty] = useState(1)

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/lootbox')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleBuy(lootboxType: 'PARTS_CRATE' | 'SUPPLY_CRATE', quantity: number) {
    setBusy(true); setError('')
    const res  = await fetch('/api/game/lootbox/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lootboxType, quantity }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Failed to buy.')
    else await fetchData()
    setBusy(false)
  }

  async function handleOpen(lootboxType: 'PARTS_CRATE' | 'SUPPLY_CRATE', quantity: number) {
    setBusy(true); setError('')
    const res  = await fetch('/api/game/lootbox/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lootboxType, quantity }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to open.'); setBusy(false); return }
    if (json.drops?.length > 0) {
      setDrops(json.drops)
      setStoppedEarly(json.stoppedEarly)
    }
    await fetchData()
    setBusy(false)
  }

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading...</div>
  if (!data)   return <div className="text-red-400 text-sm py-8">Failed to load.</div>

  const partsRemaining    = data.weeklyPartsLimit - data.weeklyPartsPurchased
  const partsLimitReached = partsRemaining <= 0
  const maxPartsBuy       = Math.min(partsRemaining, data.weeklyPartsLimit)

  return (
    <>
      {drops && (
        <LootboxDropModal
          drops={drops}
          stoppedEarly={stoppedEarly}
          onClose={() => { setDrops(null); setStoppedEarly(false) }}
        />
      )}

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Saldo */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl px-5 py-3 mb-5 flex justify-between items-center">
        <span className="text-gray-500 text-sm">Available balance</span>
        <span className="text-white font-bold font-mono">
          {Number(data.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} CRATE
        </span>
      </div>

      {/* Limite semanal */}
      <div className="flex items-center gap-2 mb-5 text-xs text-gray-600">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Parts Crate weekly limit:
        <span className={partsLimitReached ? 'text-red-400' : 'text-gray-400'}>
          {data.weeklyPartsPurchased} / {data.weeklyPartsLimit} used
          {!partsLimitReached && ` — ${partsRemaining} remaining this week`}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        <CrateCard
          title="Parts Crate"
          description="Crafting parts of various rarities. Limited to 5 purchases per week."
          price={data.prices.partsCrate}
          owned={data.partsCrates.owned}
          buyQty={partsBuyQty}
          openQty={partsOpenQty}
          maxBuy={maxPartsBuy}
          maxOpen={10}
          badge={partsLimitReached ? 'Limit reached' : `${partsRemaining} left this week`}
          badgeColor={partsLimitReached ? 'text-red-400 border-red-500/30' : 'text-gray-500 border-gray-700'}
          dropTableRows={PARTS_DROPS}
          canBuy={!partsLimitReached && data.balance >= data.prices.partsCrate}
          onBuyQtyChange={setPartsBuyQty}
          onOpenQtyChange={setPartsOpenQty}
          onBuy={() => handleBuy('PARTS_CRATE', partsBuyQty)}
          onOpen={() => handleOpen('PARTS_CRATE', partsOpenQty)}
          loading={busy}
        />
        <CrateCard
          title="Supply Crate"
          description="Robots, equipment, base upgrades and consumables. Legendary drops possible."
          price={data.prices.supplyCrate}
          owned={data.supplyCrates.owned}
          buyQty={supplyBuyQty}
          openQty={supplyOpenQty}
          maxBuy={10}
          maxOpen={10}
          dropTableRows={SUPPLY_DROPS}
          canBuy={data.balance >= data.prices.supplyCrate}
          onBuyQtyChange={setSupplyBuyQty}
          onOpenQtyChange={setSupplyOpenQty}
          onBuy={() => handleBuy('SUPPLY_CRATE', supplyBuyQty)}
          onOpen={() => handleOpen('SUPPLY_CRATE', supplyOpenQty)}
          loading={busy}
        />
      </div>
    </>
  )
}
