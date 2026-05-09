'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'

interface DepositAddressProps {
  address: string
}

export function DepositAddress({ address }: DepositAddressProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-[#0d0d15] border border-gray-800 rounded-lg p-3">
        <span className="text-gray-300 font-mono text-sm flex-1 break-all leading-relaxed">
          {address}
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 bg-[#0d0d15] border border-gray-800 rounded-lg p-5">
        <div className="bg-white p-3 rounded-lg">
          <QRCode value={address} size={160} />
        </div>
        <p className="text-gray-600 text-xs">Point your wallet camera at this QR Code</p>
      </div>

      <p className="text-xs text-gray-600">
        Network: <span className="text-yellow-600">Solana Devnet</span>
        &nbsp;·&nbsp;
        Token: <span className="text-gray-500">SOL (test)</span>
      </p>
    </div>
  )
}
