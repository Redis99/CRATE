import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          Under Development — Not yet open to players
        </div>

        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
          Inside the <span className="text-blue-500">Crate</span>
        </h1>
        <p className="text-gray-400 text-lg mb-4">Idle Mining</p>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-md mx-auto">
          Autonomous robots extract resources from alien planets.
          Build your fleet, mine $CRATE and compete for the top of the network.
        </p>

        {/* Development notice */}
        <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 mb-8 text-left space-y-2.5">
          <p className="text-gray-400 text-sm font-medium">Current development phase:</p>
          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Authentication & custodial wallet
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> SOL deposits with automatic credit
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Outpost, robots & mining system (devnet)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Inventory & lootboxes
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">○</span> Shop, crafting & P2P market
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">○</span> Minigames, Codex & missions
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">○</span> Mainnet launch — 2026 (date TBA)
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>

        <p className="text-gray-700 text-xs mt-10">
          $CRATE is a utility token. Participation does not constitute an investment.<br />
          The game is currently under development. Official launch date will be announced after all testing is complete.
        </p>
      </div>
    </div>
  )
}
