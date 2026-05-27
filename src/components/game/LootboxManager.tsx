'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DropResultType } from '@/lib/lootbox'
import { LootboxDropModal } from '@/components/game/LootboxDropModal'
import { LootboxOpeningAnimation } from '@/components/game/LootboxOpeningAnimation'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { ActionButton } from '@/components/ui/ActionButton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrateInfo {
  lootboxType: string
  name: string
  description: string
  price: number
  weeklyLimit: number | null
  owned: number
  dropEntries: { label: string; chance: string }[]
}

interface LootboxData {
  balance: number
  weeklyPartsPurchased: number
  weeklyPartsLimit: number
  crates: CrateInfo[]
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'standard' | 'robots' | 'equipment' | 'baseUpgrades'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'standard',     label: 'Standard',      icon: '📦' },
  { key: 'robots',       label: 'Robots',        icon: '🤖' },
  { key: 'equipment',    label: 'Equipment',     icon: '⚙️' },
  { key: 'baseUpgrades', label: 'Base Upgrades', icon: '🏗️' },
]

function getCrateTab(lootboxType: string): TabKey {
  if (lootboxType.startsWith('ROBOT_CRATE_'))        return 'robots'
  if (lootboxType.startsWith('EQUIPMENT_CRATE_'))    return 'equipment'
  if (lootboxType.startsWith('BASE_UPGRADE_CRATE_')) return 'baseUpgrades'
  return 'standard'
}

// ─── Rarity badge / button colors ────────────────────────────────────────────

const RARITY_OPEN_BTN: Record<string, string> = {
  COMMON:    'bg-gray-600 hover:bg-gray-500',
  UNCOMMON:  'bg-green-700 hover:bg-green-600',
  RARE:      'bg-blue-600 hover:bg-blue-500',
  EPIC:      'bg-purple-600 hover:bg-purple-500',
}

const RARITY_BADGE: Record<string, string> = {
  COMMON:    'text-gray-300 border-gray-600',
  UNCOMMON:  'text-green-400 border-green-600/40',
  RARE:      'text-blue-400 border-blue-600/40',
  EPIC:      'text-purple-400 border-purple-600/40',
}

/** Extrai a raridade do lootboxType (ex: ROBOT_CRATE_RARE → RARE) */
function getRarity(lootboxType: string): string | null {
  const match = lootboxType.match(/_(COMMON|UNCOMMON|RARE|EPIC)$/)
  return match ? match[1] : null
}

// ─── Crate Card ───────────────────────────────────────────────────────────────

function CrateCard({
  crate, weeklyPartsPurchased, weeklyPartsLimit, balance,
  buyQty, openQty, onBuyQtyChange, onOpenQtyChange,
  onBuy, onOpen, loading,
}: {
  crate: CrateInfo
  weeklyPartsPurchased: number
  weeklyPartsLimit: number
  balance: number
  buyQty: number
  openQty: number
  onBuyQtyChange: (v: number) => void
  onOpenQtyChange: (v: number) => void
  onBuy: () => void
  onOpen: () => void
  loading: boolean
}) {
  const [showDrops, setShowDrops] = useState(false)
  const { lootboxType, name, description, price, owned, dropEntries } = crate

  const isPartsCrate = lootboxType === 'PARTS_CRATE'
  const rarity       = getRarity(lootboxType)
  const isSpecific   = rarity !== null  // Robot/Equipment/BaseUpgrade crates

  const partsRemaining = weeklyPartsLimit - weeklyPartsPurchased
  const limitReached   = isPartsCrate && partsRemaining <= 0
  const maxBuy         = isPartsCrate ? Math.min(partsRemaining, weeklyPartsLimit) : 10
  const canBuy         = !limitReached && balance >= price
  const totalBuyCost   = Math.round(price * buyQty * 100) / 100

  const openBtnClass   = rarity ? (RARITY_OPEN_BTN[rarity] ?? 'bg-purple-600 hover:bg-purple-500') : 'bg-purple-600 hover:bg-purple-500'
  const badgeClass     = rarity ? (RARITY_BADGE[rarity] ?? '') : ''

  // Badge de limite / raridade
  const badge = isPartsCrate
    ? (limitReached
        ? { text: 'Limit reached',                color: 'text-red-400 border-red-500/30' }
        : { text: `${partsRemaining} left / week`, color: 'text-gray-500 border-gray-700' })
    : isSpecific && rarity
    ? { text: 'Guaranteed', color: badgeClass }
    : null

  return (
    <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-white font-semibold text-sm">{name}</h3>
            {badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${badge.color}`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <p className="text-gray-500 text-xs">per crate</p>
          <p className="text-white font-bold font-mono text-sm">{price} CRATE</p>
          {owned > 0 && <p className="text-green-400 text-xs mt-0.5">Owned: {owned}</p>}
        </div>
      </div>

      {/* Drop table */}
      {dropEntries.length > 0 && (
        <>
          <button
            onClick={() => setShowDrops((v) => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors mb-3 flex items-center gap-1 self-start"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`transition-transform ${showDrops ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {showDrops ? 'Hide' : 'View'} drop table
          </button>
          {showDrops && (
            <div className="mb-3 bg-[#0d0d15] rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {dropEntries.map((row, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="text-gray-600 font-mono">{row.chance}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex-1" />

      {/* Buy */}
      <div className="border-t border-gray-800/40 pt-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500 text-xs">Buy quantity</span>
          <QuantityStepper value={buyQty} min={1} max={maxBuy} onChange={onBuyQtyChange} />
        </div>
        <ActionButton variant="outline" fullWidth onClick={onBuy} disabled={!canBuy || loading} loading={loading}>
          {`Buy ${buyQty}× — ${totalBuyCost.toFixed(2)} CRATE`}
        </ActionButton>
      </div>

      {/* Open */}
      {owned > 0 && (
        <div className="border-t border-gray-800/40 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-xs">Open quantity</span>
            <QuantityStepper value={openQty} min={1} max={Math.min(10, owned)} onChange={onOpenQtyChange} />
          </div>
          <button
            onClick={onOpen}
            disabled={loading}
            className={`w-full py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors ${openBtnClass}`}
          >
            {loading ? 'Opening...' : `Open ${openQty}×`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LootboxManager() {
  const [data, setData]         = useState<LootboxData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [drops, setDrops]             = useState<DropResultType[] | null>(null)
  const [stoppedEarly, setStoppedEarly] = useState(false)
  // Animation state: true = show opening animation, pendingDrops = waiting for API
  const [animating, setAnimating]       = useState(false)
  const [pendingDrops, setPendingDrops] = useState<DropResultType[] | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('standard')

  const [buyQtys,  setBuyQtys]  = useState<Record<string, number>>({})
  const [openQtys, setOpenQtys] = useState<Record<string, number>>({})

  const getQty = (map: Record<string, number>, type: string) => map[type] ?? 1
  const setQty = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    type: string, val: number,
  ) => setter((prev) => ({ ...prev, [type]: val }))

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/lootbox')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleBuy(lootboxType: string, quantity: number) {
    setBusy(true); setError(''); setSuccess('')
    const res  = await fetch('/api/game/lootbox/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lootboxType, quantity }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to buy.')
    } else {
      const crate = data?.crates.find((c) => c.lootboxType === lootboxType)
      setSuccess(`${json.purchased}× ${crate?.name ?? lootboxType} added to your inventory!`)
      await fetchData()
    }
    setBusy(false)
  }

  async function handleOpen(lootboxType: string, quantity: number) {
    setBusy(true); setError(''); setSuccess('')

    // Show opening animation immediately — API runs in parallel
    setAnimating(true)
    setPendingDrops(null)

    const res  = await fetch('/api/game/lootbox/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lootboxType, quantity }),
    })
    const json = await res.json()

    if (!res.ok) {
      setAnimating(false)
      setPendingDrops(null)
      setError(json.error ?? 'Failed to open.')
      setBusy(false)
      return
    }

    if (json.drops?.length > 0) {
      setStoppedEarly(json.stoppedEarly ?? false)
      // Hand drops to animation — onReveal is called after burst, then shows modal
      setPendingDrops(json.drops)
      // Refresh lootbox counts in background — does NOT block the animation
      fetchData().catch(console.error)
    } else {
      setAnimating(false)
      setPendingDrops(null)
      // stoppedEarly=true → inventory blocked the first drop
      // stoppedEarly=false here means something unexpected happened
      const msg = json.stoppedEarly
        ? 'Inventory is full — free up space before opening more lootboxes.'
        : (json.error ?? 'No items were generated. Please try again.')
      setError(msg)
    }

    setBusy(false)
  }

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading...</div>
  if (!data)   return <div className="text-red-400 text-sm py-8">Failed to load.</div>

  // Agrupa crates por tab
  const cratesByTab: Record<TabKey, CrateInfo[]> = {
    standard:     [],
    robots:       [],
    equipment:    [],
    baseUpgrades: [],
  }
  for (const crate of data.crates) {
    cratesByTab[getCrateTab(crate.lootboxType)].push(crate)
  }

  // Badge de contagem de owned por tab
  const tabOwned: Record<TabKey, number> = {
    standard:     cratesByTab.standard.reduce((s, c) => s + c.owned, 0),
    robots:       cratesByTab.robots.reduce((s, c) => s + c.owned, 0),
    equipment:    cratesByTab.equipment.reduce((s, c) => s + c.owned, 0),
    baseUpgrades: cratesByTab.baseUpgrades.reduce((s, c) => s + c.owned, 0),
  }

  const visibleCrates = cratesByTab[activeTab]

  // Limite semanal: relevante apenas na aba Standard
  const partsRemaining = data.weeklyPartsLimit - data.weeklyPartsPurchased
  const partsLimitReached = partsRemaining <= 0

  return (
    <>
      {/* Opening animation — shown while API call + animation runs */}
      {animating && (
        <LootboxOpeningAnimation
          drops={pendingDrops}
          onReveal={(revealedDrops) => {
            setAnimating(false)
            setPendingDrops(null)
            setDrops(revealedDrops)
          }}
        />
      )}

      {/* Drop result modal */}
      {drops && (
        <LootboxDropModal
          drops={drops}
          stoppedEarly={stoppedEarly}
          onClose={() => { setDrops(null); setStoppedEarly(false) }}
        />
      )}

      {/* Feedback */}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex justify-between items-center">
          <p className="text-green-400 text-sm">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400/60 text-xs ml-3">✕</button>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex justify-between items-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-400/60 text-xs ml-3">✕</button>
        </div>
      )}

      {/* Saldo */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl px-5 py-3 mb-5 flex justify-between items-center">
        <span className="text-gray-500 text-sm">Available balance</span>
        <span className="text-white font-bold font-mono">
          {Number(data.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} CRATE
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0d15] rounded-xl p-1 mb-5">
        {TABS.map(({ key, label, icon }) => {
          const owned = tabOwned[key]
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setError(''); setSuccess('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors relative ${
                activeTab === key
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
              {owned > 0 && (
                <span className="absolute top-1 right-1 bg-green-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  {owned > 9 ? '9+' : owned}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Limite semanal (só na aba Standard) */}
      {activeTab === 'standard' && (
        <div className="flex items-center gap-2 mb-5 text-xs text-gray-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Parts Crate weekly limit:
          <span className={partsLimitReached ? 'text-red-400' : 'text-gray-400'}>
            {data.weeklyPartsPurchased} / {data.weeklyPartsLimit} used
            {!partsLimitReached && ` — ${partsRemaining} remaining this week`}
          </span>
        </div>
      )}

      {/* Grade de crates */}
      {visibleCrates.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-sm">No crates available in this category.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${visibleCrates.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-2'}`}>
          {visibleCrates.map((crate) => (
            <CrateCard
              key={crate.lootboxType}
              crate={crate}
              weeklyPartsPurchased={data.weeklyPartsPurchased}
              weeklyPartsLimit={data.weeklyPartsLimit}
              balance={data.balance}
              buyQty={getQty(buyQtys, crate.lootboxType)}
              openQty={getQty(openQtys, crate.lootboxType)}
              onBuyQtyChange={(v) => setQty(setBuyQtys,  crate.lootboxType, v)}
              onOpenQtyChange={(v) => setQty(setOpenQtys, crate.lootboxType, v)}
              onBuy={() => handleBuy(crate.lootboxType, getQty(buyQtys, crate.lootboxType))}
              onOpen={() => handleOpen(crate.lootboxType, getQty(openQtys, crate.lootboxType))}
              loading={busy}
            />
          ))}
        </div>
      )}
    </>
  )
}
