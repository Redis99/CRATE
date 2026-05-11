'use client'

import { useState, useEffect, useCallback } from 'react'
import { MarketListingCard } from '@/components/game/MarketListingCard'
import { RarityBadge } from '@/components/ui/RarityBadge'
import { ActionButton } from '@/components/ui/ActionButton'
import { CategoryTag } from '@/components/game/CategoryTag'
import { sortByRarity, type Rarity } from '@/lib/rarity'
import type { MarketListing } from '@/components/game/MarketListingCard'

type MarketTab    = 'browse' | 'mine' | 'sell'
type SellItemType = 'ROBOT' | 'EQUIPMENT' | 'BASE_UPGRADE'

interface RobotEquipSlot { equipmentId: string; equipment: { id: string; name: string } }
interface SellableItem { id: string; name: string; rarity: string; equipments?: RobotEquipSlot[]; [key: string]: unknown }
interface SellableItems { robots: SellableItem[]; equipments: SellableItem[]; baseUpgrades: SellableItem[] }

// ─── Sell Form ────────────────────────────────────────────────────────────────

function SellForm({ onListed }: { onListed: () => void }) {
  const [sellables, setSellables]   = useState<SellableItems | null>(null)
  const [itemType, setItemType]     = useState<SellItemType>('ROBOT')
  const [selectedId, setSelectedId] = useState('')
  const [price, setPrice]             = useState('')
  const [listing, setListing]         = useState(false)
  const [unequipping, setUnequipping] = useState(false)
  const [confirmEquipped, setConfirmEquipped] = useState(false)
  const [error, setError]             = useState('')

  const reloadSellables = useCallback(() => {
    fetch('/api/game/market?mode=sell').then((r) => r.json()).then(setSellables)
  }, [])

  useEffect(() => { reloadSellables() }, [reloadSellables])

  const itemList = sellables
    ? itemType === 'ROBOT'        ? sortByRarity(sellables.robots)
      : itemType === 'EQUIPMENT'  ? sortByRarity(sellables.equipments)
      : sortByRarity(sellables.baseUpgrades)
    : []

  // Robô selecionado tem equipamentos instalados?
  const selectedRobot   = itemType === 'ROBOT' ? (sellables?.robots ?? []).find((r) => r.id === selectedId) : undefined
  const equippedItems   = selectedRobot?.equipments ?? []
  const hasEquipment    = equippedItems.length > 0

  // Remove todos os equipamentos do robô selecionado antes de listar
  async function handleUnequipAll() {
    setUnequipping(true); setError('')
    for (const slot of equippedItems) {
      await fetch('/api/game/equipment/unequip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId: slot.equipment.id }),
      })
    }
    setUnequipping(false)
    setConfirmEquipped(false)
    reloadSellables()
  }

  async function handleList() {
    if (!selectedId || !price || Number(price) < 0.01) {
      setError('Select an item and set a price ≥ 0.01 CRATE.'); return
    }
    // Se robô tem equipamentos e jogador ainda não confirmou, pede confirmação
    if (hasEquipment && !confirmEquipped) {
      setConfirmEquipped(true); return
    }
    setListing(true); setError('')
    const res  = await fetch('/api/game/market/list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId: selectedId, price: Number(price) }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to list.'); setListing(false); return }
    setSelectedId(''); setPrice(''); setListing(false); setConfirmEquipped(false)
    onListed()
  }

  const effectLabel = (item: SellableItem) => {
    const et = item.effectType as string | undefined
    const ev = item.effectValue as number | undefined
    if (et && ev != null) return `${et.replace(/_/g, ' ')} +${ev}`
    return ''
  }

  return (
    <div className="max-w-md space-y-4">
      {/* Item type */}
      <div className="flex gap-2">
        {(['ROBOT', 'EQUIPMENT', 'BASE_UPGRADE'] as SellItemType[]).map((t) => (
          <button key={t} onClick={() => { setItemType(t); setSelectedId('') }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              itemType === t ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' : 'text-gray-500 border-gray-700/50 hover:text-gray-300'
            }`}>
            {t === 'BASE_UPGRADE' ? 'Base Upgrade' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Item selection */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {itemList.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No eligible items.</p>
        ) : itemList.map((item) => (
          <button key={item.id} onClick={() => setSelectedId(item.id)}
            className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
              selectedId === item.id ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-gray-700/50 bg-[#0d0d15] hover:border-gray-600'
            }`}>
            <RarityBadge rarity={item.rarity as Rarity} />
            <span className="text-white text-xs flex-1 truncate">{String(item.name)}</span>
            {item.effectType != null && <CategoryTag effectType={String(item.effectType)} />}
            <span className="text-gray-600 text-xs">{effectLabel(item)}</span>
          </button>
        ))}
      </div>

      {/* Warning: robô com equipamentos */}
      {hasEquipment && selectedId && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-2">
          <p className="text-yellow-400 text-xs font-medium">
            ⚠️ This robot has {equippedItems.length} equipment(s) installed:
          </p>
          <ul className="space-y-0.5">
            {equippedItems.map((slot) => (
              <li key={slot.equipmentId} className="text-gray-400 text-xs">· {slot.equipment.name}</li>
            ))}
          </ul>
          <p className="text-gray-500 text-xs">The buyer will receive the robot and all installed equipment.</p>

          {confirmEquipped ? (
            <div className="flex gap-2 pt-1">
              <ActionButton variant="danger" size="sm" loading={unequipping} loadingText="Removing..." onClick={handleUnequipAll}>
                Remove Equipment First
              </ActionButton>
              <ActionButton variant="primary" size="sm" loading={listing} loadingText="Listing..." onClick={handleList}>
                List with Equipment
              </ActionButton>
            </div>
          ) : (
            <ActionButton variant="danger" size="sm" loading={unequipping} loadingText="Removing..." onClick={handleUnequipAll}>
              Remove All Equipment
            </ActionButton>
          )}
        </div>
      )}

      {/* Price */}
      {(!hasEquipment || !confirmEquipped) && (
        <div>
          <label className="text-gray-500 text-xs block mb-1.5">Price (CRATE)</label>
          <div className="flex gap-2">
            <input type="number" min="0.01" step="0.01" value={price}
              onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 25.00"
              className="flex-1 bg-[#0d0d15] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <ActionButton variant="primary" size="md" disabled={!selectedId || !price} loading={listing} loadingText="Listing..." onClick={handleList}>
              {hasEquipment ? 'Next →' : 'List Item'}
            </ActionButton>
          </div>
          {price && Number(price) > 0 && (
            <p className="text-gray-600 text-xs mt-1">
              You receive: <span className="text-gray-400">{(Number(price) * 0.95).toFixed(2)} CRATE</span> after 5% fee
            </p>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MarketManager() {
  const [tab, setTab]               = useState<MarketTab>('browse')
  const [listings, setListings]     = useState<MarketListing[]>([])
  const [myListings, setMyListings] = useState<MarketListing[]>([])
  const [userId, setUserId]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [buying, setBuying]         = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  const fetchBrowse = useCallback(async () => {
    const res = await fetch('/api/game/market?mode=browse')
    if (res.ok) { const j = await res.json(); setListings(j.listings); setUserId(j.userId) }
    setLoading(false)
  }, [])

  const fetchMine = useCallback(async () => {
    const res = await fetch('/api/game/market?mode=mine')
    if (res.ok) { const j = await res.json(); setMyListings(j.listings) }
  }, [])

  useEffect(() => { fetchBrowse(); fetchMine() }, [fetchBrowse, fetchMine])

  async function handleBuy(listingId: string) {
    setBuying(listingId); setError(''); setSuccess('')
    const res  = await fetch('/api/game/market/buy', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Purchase failed.')
    else { setSuccess('Purchase successful! Check your inventory.'); fetchBrowse(); fetchMine() }
    setBuying(null)
  }

  async function handleCancel(listingId: string) {
    setCancelling(listingId); setError('')
    const res  = await fetch('/api/game/market/cancel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Failed to cancel.')
    else { fetchBrowse(); fetchMine() }
    setCancelling(null)
  }

  const TABS: { key: MarketTab; label: string; count?: number }[] = [
    { key: 'browse', label: 'Browse', count: listings.filter((l) => l.sellerId !== userId).length },
    { key: 'mine',   label: 'My Listings', count: myListings.length },
    { key: 'sell',   label: 'Sell Item' },
  ]

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading market...</div>

  return (
    <div>
      {/* Feedback */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-400/60 text-xs">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex justify-between">
          <p className="text-green-400 text-sm">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400/60 text-xs">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0d15] rounded-xl p-1 mb-5">
        {TABS.map(({ key, label, count }) => (
          <button key={key} onClick={() => { setTab(key); setError(''); setSuccess('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === key ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {label}
            {count !== undefined && count > 0 && (
              <span className={`px-1 rounded text-xs ${tab === key ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'browse' && (
        listings.filter((l) => l.sellerId !== userId).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">No listings available yet.</p>
            <p className="text-gray-700 text-xs mt-1">Be the first to list an item!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {listings.filter((l) => l.sellerId !== userId).map((l) => (
              <MarketListingCard key={l.id} listing={l} isOwn={false}
                buying={buying === l.id} cancelling={false}
                onBuy={handleBuy} onCancel={handleCancel} />
            ))}
          </div>
        )
      )}

      {tab === 'mine' && (
        myListings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">You have no active listings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {myListings.map((l) => (
              <MarketListingCard key={l.id} listing={l} isOwn
                buying={false} cancelling={cancelling === l.id}
                onBuy={handleBuy} onCancel={handleCancel} />
            ))}
          </div>
        )
      )}

      {tab === 'sell' && (
        <SellForm onListed={() => { setTab('mine'); fetchBrowse(); fetchMine() }} />
      )}
    </div>
  )
}
