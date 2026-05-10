'use client'

import { useState } from 'react'

interface BalanceDropdownProps {
  crate: number
  sol: number
  lc: number
}

export function BalanceDropdown({ crate, sol, lc }: BalanceDropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-[#111118] border border-gray-800/60 rounded-xl px-5 py-3.5 hover:border-gray-700 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
            <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" />
            <path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
          <span className="text-gray-400 text-sm">Wallet Balances</span>
          <span className="text-white font-mono text-sm font-medium">
            {crate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="text-gray-500 font-normal ml-1">CRATE</span>
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">CRATE</p>
            <p className="text-white text-lg font-bold font-mono">
              {crate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-gray-600 text-xs mt-1">Main currency</p>
          </div>
          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">SOL</p>
            <p className="text-white text-lg font-bold font-mono">
              {sol.toLocaleString('en-US', { minimumFractionDigits: 4 })}
            </p>
            <p className="text-gray-600 text-xs mt-1">Minable</p>
          </div>
          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">LC Shib</p>
            <p className="text-white text-lg font-bold font-mono">
              {lc.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-gray-600 text-xs mt-1">Minable</p>
          </div>
        </div>
      )}
    </div>
  )
}
