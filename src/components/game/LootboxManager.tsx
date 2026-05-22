'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DropResultType } from '@/lib/lootbox'
import { LootboxDropModal } from '@/components/game/LootboxDropModal'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { ActionButton } from '@/components/ui/ActionButton'

// ─── Types (espelham a resposta da API) ───────────────────────────────────────

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

// ─── Rarity color map ─────────────────────────────────────────────────────────

const RARITY_BADGE: Record<string, string> = {
  ROBOT_CRATE_COMMON:   'text-gray-300 border-gray-600',
  ROBOT_CRATE_UNCOMMON: 'text-green-400 border-green-600/40',
  ROBOT_CRATE_RARE:     'text-blue-400 border-blue-600/40',
  ROBOT_CRATE_EPIC:     'text-purple-400 border-purple-600/40',
}

const RARITY_OPEN_BTN: Record<string, string> = {
  ROBOT_CRATE_COMMON:   'bg-gray-600 hover:bg-gray-500',
  ROBOT_CRATE_UNCOMMON: 'bg-green-700 hover:bg-green-600',
  ROBOT_CRATE_RARE:     'bg-blue-600 hover:bg-blue-500',
  ROBOT_CRATE_EPIC:     'bg-purple-600 hover:bg-purple-500',
}

// ─── Crate Card ───────────────────────────────────────────────────────────────

function CrateCard({
  crate,
  weeklyPartsPurchased,
  weeklyPartsLimit,
  balance,
  buyQty, openQty,
  onBuyQtyChange, onOpenQtyChange,
  onBuy, onOpen,
  loading,
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
  const { lootboxType, name, description, price, weeklyLimit, owned, dropEntries } = crate

  const isPartsCrate   = lootboxType === 'PARTS_CRATE'
  const isRobotCrate   = lootboxType.startsWith('ROBOT_CRATE_')
  const partsRemaining = weeklyPartsLimit - weeklyPartsPurchased
  const limitReached   = isPartsCrate && partsRemaining <= 0

  const maxBuy = isPartsCrate
    ? Math.min(partsRemaining, weeklyPartsLimit)
    : 10

  const canBuy = !limitReached && balance >= price

  const totalBuyCost = Math.round(price * buyQty * 100) / 100

  // Badge de limite semanal
  const badge = isPartsCrate
    ? (limitReached
        ? { text: 'Limit reached',       color: 'text-red-400 border-red-500/30' }
        : { text: `${partsRemaining} left this week`, color: 'text-gray-500 border-gray-700' })
    : weeklyLimit
    ? { text: `Max ${weeklyLimit}/week`, color: 'text-gray-500 border-gray-700' }
    : null

  // Botão de abertura: cor por tipo
  const openBtnClass = RARITY_OPEN_BTN[lootboxType] ?? 'bg-purple-600 hover:bg-purple-500'
  const rarityBadgeClass = RARITY_BADGE[lootboxType]

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
            {isRobotCrate && rarityBadgeClass && (
              <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${rarityBadgeClass}`}>
                Guaranteed
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

      {/* Drop table toggle */}
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

      {/* Espaço restante empurra ações para o fundo */}
      <div className="flex-1" />

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
            <QuantityStepper value={openQty} min={1} max={Math.min(10, owned)} onChange={onOpenQtyChange} />
          </div>
          <button
            onClick={onOpen}
            disabled={loading}
            className={`w-full py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors ${openBtnClass}`}
          >
            {loading ? 'Opening...' : `Open ${openQty}× ${isRobotCrate ? name : name.split(' ')[0] + ' Crate'}`}
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
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [drops, setDrops]       = useState<DropResultType[] | null>(null)
  const [stoppedEarly, setStoppedEarly] = useState(false)

  // Quantidades por tipo de crate: buy + open
  const [buyQtys,  setBuyQtys]  = useState<Record<string, number>>({})
  const [openQtys, setOpenQtys] = useState<Record<string, number>>({})

  const getQty = (map: Record<string, number>, type: string) => map[type] ?? 1
  const setQty = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    type: string,
    val: number,
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
    } else {
      setError('Inventory is full. Free up some space before opening lootboxes.')
    }

    await fetchData()
    setBusy(false)
  }

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading...</div>
  if (!data)   return <div className="text-red-400 text-sm py-8">Failed to load.</div>

  const standardCrates = data.crates.filter((c) => !c.lootboxType.startsWith('ROBOT_CRATE_'))
  const robotCrates    = data.crates.filter((c) => c.lootboxType.startsWith('ROBOT_CRATE_'))

  return (
    <>
      {drops && (
        <LootboxDropModal
          drops={drops}
          stoppedEarly={stoppedEarly}
          onClose={() => { setDrops(null); setStoppedEarly(false) }}
        />
      )}

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

      {/* Limite semanal Parts Crate */}
      {(() => {
        const partsCrate = data.crates.find((c) => c.lootboxType === 'PARTS_CRATE')
        if (!partsCrate) return null
        const remaining    = data.weeklyPartsLimit - data.weeklyPartsPurchased
        const limitReached = remaining <= 0
        return (
          <div className="flex items-center gap-2 mb-5 text-xs text-gray-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Parts Crate weekly limit:
            <span className={limitReached ? 'text-red-400' : 'text-gray-400'}>
              {data.weeklyPartsPurchased} / {data.weeklyPartsLimit} used
              {!limitReached && ` — ${remaining} remaining this week`}
            </span>
          </div>
        )
      })()}

      {/* Standard Crates (Parts + Supply + quaisquer outros não-robot) */}
      {standardCrates.length > 0 && (
        <div className={`grid gap-4 mb-8 ${standardCrates.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2'}`}>
          {standardCrates.map((crate) => (
            <CrateCard
              key={crate.lootboxType}
              crate={crate}
              weeklyPartsPurchased={data.weeklyPartsPurchased}
              weeklyPartsLimit={data.weeklyPartsLimit}
              balance={data.balance}
              buyQty={getQty(buyQtys,  crate.lootboxType)}
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

      {/* Robot Crates */}
      {robotCrates.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-gray-400 text-sm font-medium">Robot Crates</h2>
            <div className="flex-1 h-px bg-gray-800/60" />
            <span className="text-xs text-gray-600">Guaranteed robot by rarity</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {robotCrates.map((crate) => (
              <CrateCard
                key={crate.lootboxType}
                crate={crate}
                weeklyPartsPurchased={data.weeklyPartsPurchased}
                weeklyPartsLimit={data.weeklyPartsLimit}
                balance={data.balance}
                buyQty={getQty(buyQtys,  crate.lootboxType)}
                openQty={getQty(openQtys, crate.lootboxType)}
                onBuyQtyChange={(v) => setQty(setBuyQtys,  crate.lootboxType, v)}
                onOpenQtyChange={(v) => setQty(setOpenQtys, crate.lootboxType, v)}
                onBuy={() => handleBuy(crate.lootboxType, getQty(buyQtys, crate.lootboxType))}
                onOpen={() => handleOpen(crate.lootboxType, getQty(openQtys, crate.lootboxType))}
                loading={busy}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
