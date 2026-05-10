'use client'

import { useState } from 'react'
import { ERIcon } from '@/components/ui/ERIcon'
import { MiningBlockTimer } from '@/components/game/MiningBlockTimer'
import { ActionButton } from '@/components/ui/ActionButton'

type MiningToken = 'CRATE' | 'SOL' | 'LC'

interface BlockRewards { CRATE: number; SOL: number; LC: number }
interface Allocation   { CRATE: number; SOL: number; LC: number }

interface MiningRewardsCardProps {
  userER: number
  networkER: number
  blockRewards: BlockRewards
  lastBlockAt: string | null
  totalMined: number
  allocation: Allocation
}

const TOKEN_LABEL: Record<MiningToken, string> = { CRATE: 'CRATE', SOL: 'SOL', LC: 'LC Shib' }
const TOKEN_COLOR: Record<MiningToken, string>  = { CRATE: 'text-blue-400', SOL: 'text-purple-400', LC: 'text-orange-400' }
const TOKEN_BAR:   Record<MiningToken, string>  = { CRATE: 'bg-blue-500',   SOL: 'bg-purple-500',   LC: 'bg-orange-500'   }
const TOKENS: MiningToken[] = ['CRATE', 'SOL', 'LC']

// ─── Modal de alocação ───────────────────────────────────────────────────────

function AllocationModal({
  current,
  onClose,
  onSave,
}: {
  current: Allocation
  onClose: () => void
  onSave: (a: Allocation) => Promise<void>
}) {
  const [values, setValues] = useState({
    CRATE: String(current.CRATE),
    SOL:   String(current.SOL),
    LC:    String(current.LC),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const parsed = {
    CRATE: parseFloat(values.CRATE) || 0,
    SOL:   parseFloat(values.SOL)   || 0,
    LC:    parseFloat(values.LC)    || 0,
  }
  const total    = parsed.CRATE + parsed.SOL + parsed.LC
  const isValid  = Math.abs(total - 100) < 0.01
  const hasNeg   = parsed.CRATE < 0 || parsed.SOL < 0 || parsed.LC < 0

  async function handleSave() {
    if (!isValid || hasNeg) return
    setSaving(true)
    setError('')
    try {
      await onSave(parsed)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#111118] border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Mining Allocation</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="text-gray-500 text-xs mb-5 leading-relaxed">
          Set how much of your mining power to allocate to each token.
          Values must add up to exactly <span className="text-white">100%</span>.
        </p>

        {/* Barra visual de proporção */}
        <div className="flex h-2 rounded-full overflow-hidden mb-5 gap-px">
          {TOKENS.map((token) => (
            <div
              key={token}
              className={`${TOKEN_BAR[token]} transition-all duration-200`}
              style={{ width: `${Math.min(100, Math.max(0, parsed[token]))}%` }}
            />
          ))}
        </div>

        {/* Inputs */}
        <div className="space-y-3 mb-5">
          {TOKENS.map((token) => (
            <div key={token} className="flex items-center gap-3">
              <span className={`text-sm font-medium w-16 ${TOKEN_COLOR[token]}`}>
                {TOKEN_LABEL[token]}
              </span>
              <div className="flex-1 relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={values[token]}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [token]: e.target.value }))
                    setError('')
                  }}
                  className="w-full bg-[#1a1a28] border border-gray-700 rounded-lg px-3 py-2 pr-8 text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totalizador */}
        <div className={`flex justify-between items-center text-xs mb-4 px-1 ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          <span>{isValid ? '✓ Total is 100%' : hasNeg ? 'Values cannot be negative' : `Total: ${total.toFixed(1)}% — needs to be 100%`}</span>
          <span className="font-mono font-semibold">{total.toFixed(1)}%</span>
        </div>

        {error && (
          <p className="text-red-400 text-xs mb-3">{error}</p>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <ActionButton variant="ghost" onClick={onClose} className="flex-1">Cancel</ActionButton>
          <ActionButton
            variant="primary"
            onClick={handleSave}
            disabled={!isValid || hasNeg || saving}
            loading={saving}
            loadingText="Saving..."
            className="flex-1"
          >
            Save
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

// ─── Card principal ──────────────────────────────────────────────────────────

export function MiningRewardsCard({
  userER,
  networkER,
  blockRewards,
  lastBlockAt,
  totalMined,
  allocation: initialAllocation,
}: MiningRewardsCardProps) {
  const [selectedToken, setSelectedToken]     = useState<MiningToken>('CRATE')
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false)
  const [alloc, setAlloc]                     = useState<Allocation>(initialAllocation)
  const [showModal, setShowModal]             = useState(false)

  const blockReward      = blockRewards[selectedToken]
  const userWeighted     = userER * (alloc[selectedToken] / 100)
  const estimatedPool    = networkER * (alloc[selectedToken] / 100)
  const userShare        = estimatedPool > 0 ? userWeighted / estimatedPool : 0
  const estimatedPerBlock = blockReward * userShare
  const estimatedPerHour  = estimatedPerBlock * 4
  const isBootstrapLocked = selectedToken !== 'CRATE' && blockReward === 0

  async function saveAllocation(newAlloc: Allocation) {
    const res  = await fetch('/api/game/mining/allocation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crate: newAlloc.CRATE, sol: newAlloc.SOL, lc: newAlloc.LC }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to save.')
    setAlloc(newAlloc)
  }

  return (
    <>
      {showModal && (
        <AllocationModal
          current={alloc}
          onClose={() => setShowModal(false)}
          onSave={saveAllocation}
        />
      )}

      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold text-sm">Mining Rewards</h3>
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              Bootstrap
            </span>
          </div>
          {/* Seletor de token */}
          <div className="relative">
            <button
              onClick={() => setTokenDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-gray-600 transition-colors"
            >
              <span className={TOKEN_COLOR[selectedToken]}>{TOKEN_LABEL[selectedToken]}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`text-gray-500 transition-transform duration-150 ${tokenDropdownOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {tokenDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-[#1a1a28] border border-gray-700 rounded-lg overflow-hidden z-10 shadow-lg">
                {TOKENS.map((token) => (
                  <button key={token}
                    onClick={() => { setSelectedToken(token); setTokenDropdownOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-700/50 ${selectedToken === token ? 'bg-gray-700/30' : ''} ${TOKEN_COLOR[token]}`}
                  >
                    {TOKEN_LABEL[token]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats do token selecionado */}
        {isBootstrapLocked ? (
          <div className="py-2 text-center mb-3">
            <p className="text-gray-500 text-xs">{TOKEN_LABEL[selectedToken]} rewards unlock after the Bootstrap Period.</p>
            <p className="text-gray-700 text-xs mt-0.5">Only CRATE is distributed right now.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">Block reward</span>
              <span className="text-gray-300 text-xs font-mono">{blockReward} {TOKEN_LABEL[selectedToken]}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">Your allocation</span>
              <span className={`text-xs font-mono ${TOKEN_COLOR[selectedToken]}`}>{alloc[selectedToken].toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">Est. per block</span>
              <span className="text-green-400 text-xs font-mono">+{estimatedPerBlock.toFixed(4)} {TOKEN_LABEL[selectedToken]}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-xs">Est. per hour</span>
              <span className="text-green-400 text-xs font-mono">+{estimatedPerHour.toFixed(3)} {TOKEN_LABEL[selectedToken]}</span>
            </div>
          </div>
        )}

        {/* Alocação compacta + botão */}
        <div className="border-t border-gray-800/60 pt-3 mt-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-xs">Allocation</p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Allocate
            </button>
          </div>
          {/* Barra visual resumida */}
          <div className="flex h-1.5 rounded-full overflow-hidden mb-2 gap-px">
            {TOKENS.map((token) => (
              <div key={token} className={`${TOKEN_BAR[token]} transition-all`} style={{ width: `${alloc[token]}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-xs">
            {TOKENS.map((token) => (
              <span key={token} className={TOKEN_COLOR[token]}>
                {TOKEN_LABEL[token]} <span className="text-gray-500">{alloc[token].toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stats da rede */}
        <div className="border-t border-gray-800/60 pt-2.5 mt-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Network ER</span>
            <span className="text-gray-400 text-xs font-mono flex items-center gap-1">
              {networkER.toFixed(1)} <ERIcon size={11} />
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Total mined</span>
            <span className="text-gray-400 text-xs font-mono">{totalMined.toFixed(2)} CRATE</span>
          </div>
        </div>

        <MiningBlockTimer lastBlockAt={lastBlockAt} />
      </div>
    </>
  )
}
