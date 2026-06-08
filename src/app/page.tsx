'use client'

import Link from 'next/link'
import { useState } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What is Inside the Crate?',
    a: 'Inside the Crate is a browser-based idle mining game on Solana. Deploy autonomous robots to extract resources 24/7, open lootboxes, craft equipment, and compete in weekly rankings — no downloads, no wallet connection required.',
  },
  {
    q: 'Do I need a crypto wallet like Phantom?',
    a: 'No. You sign up with email and password. The game provides a custodial deposit address for each player. Just send SOL to that address to fund your account, then convert it to $CRATE to start playing.',
  },
  {
    q: 'Is this pay-to-win?',
    a: 'No. Every item in the game can be obtained for free through mining rewards, minigame victories, weekly drops, missions, and the P2P market. Spending only gives earlier access to items — not exclusive power advantages.',
  },
  {
    q: 'What is $CRATE?',
    a: '$CRATE is the utility token of Inside the Crate, launching on Solana via DegenSafe. It is the primary currency for the in-game economy: lootboxes, shop purchases, crafting, and market trading. It is not an investment product.',
  },
  {
    q: 'How does mining work?',
    a: 'Each robot has an Extraction Rate (ER). Your share of every reward block is proportional to your total ER vs the entire network. Blocks are processed every 15 minutes — roughly 96 blocks per day. Keep your robots repaired to maintain full output.',
  },
  {
    q: 'What are lootboxes?',
    a: 'Two types: Parts Crates (~$0.50 in $CRATE, limited to 5 per week) drop crafting components. Supply Crates (~$5 in $CRATE) drop robots, equipment, and base upgrades — including Legendary items that are never sold in the shop.',
  },
  {
    q: 'Can I withdraw $CRATE?',
    a: 'Yes. Withdrawals are processed manually by the team once per day. A minimum withdrawal amount applies. Because the wallet is custodial, you trust the platform to hold your funds — see the legal notices below.',
  },
  {
    q: 'When does the game launch?',
    a: 'Mainnet launch is targeted for December 2026. The full game is complete on devnet. Follow @insidecrate on X for the official launch announcement.',
  },
]

const ROADMAP_PHASES = [
  {
    phase: '01',
    title: 'Foundation',
    period: 'May – Jul 2026',
    items: ['Authentication & custodial wallets', 'SOL deposits with auto sweep', 'Landing page'],
    status: 'done' as const,
  },
  {
    phase: '02',
    title: 'Core Gameplay',
    period: 'Aug – Oct 2026',
    items: ['Outpost & robot management', 'Idle mining with 15-min blocks', 'Inventory & lootboxes'],
    status: 'done' as const,
  },
  {
    phase: '03',
    title: 'Economy',
    period: 'Oct – Nov 2026',
    items: ['In-game shop & crafting', 'P2P marketplace (5% fee → pool)', 'SOL → $CRATE conversion'],
    status: 'done' as const,
  },
  {
    phase: '04',
    title: 'Content',
    period: 'Nov 2026',
    items: ['5 minigames with ER boosts', 'Codex trophy system', 'Missions & seasonal events'],
    status: 'done' as const,
  },
  {
    phase: '05',
    title: 'Mainnet Launch',
    period: 'Dec 2026',
    items: ['Live $CRATE token on Solana', 'Jupiter real-time pricing', 'Public launch — Season 1'],
    status: 'current' as const,
  },
]

const EARN_SOURCES = [
  { label: 'Idle Mining', desc: "Share of reward pool based on your fleet's ER" },
  { label: 'Weekly Ranking', desc: 'Top 10 miners earn Supply & Parts Crates' },
  { label: 'Minigames', desc: '5 games — win to get drops and ER boosts' },
  { label: 'Missions', desc: 'Complete objectives for crates, robots and items' },
  { label: 'Weekly Drop', desc: 'Free drop every Monday for active players' },
  { label: 'P2P Market', desc: 'Sell robots and equipment to other players' },
]

const SPEND_SINKS = [
  { label: 'Lootboxes', desc: 'Parts Crates and Supply Crates' },
  { label: 'Shop', desc: 'Buy robots, equipment and base upgrades' },
  { label: 'Crafting', desc: 'Combine parts into powerful items' },
  { label: 'Outpost Slots', desc: 'Expand from 3 to 6 robot slots' },
  { label: 'Inventory Expansion', desc: 'Unlock more item storage' },
  { label: 'P2P Market', desc: 'Buy items from other players' },
]

const LEGAL_ITEMS = [
  '$CRATE is a utility token with no guaranteed monetary value.',
  'Participation in the game does not constitute an investment or financial product.',
  'No promise of financial return is made, explicit or implied.',
  'The wallet is custodial — you trust the platform to hold your deposits.',
  'Withdrawals are processed manually and may take up to 24 hours.',
  'In-game items have no value outside the platform.',
  'The project may pause or cease operations at any time without notice.',
  'Users are responsible for complying with local laws regarding cryptocurrency usage.',
]

// ─── Components ───────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function SectionHeading({ label, title, sub }: { label: string; title: string; sub?: string }) {
  return (
    <div className="text-center mb-14">
      <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">{label}</span>
      <h2 className="mt-2 text-3xl md:text-4xl font-bold text-white">{title}</h2>
      {sub && <p className="mt-3 text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">{sub}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-sm tracking-tight">
            Inside the <span className="text-blue-500">Crate</span>
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#tokenomics" className="hover:text-white transition-colors">Tokenomics</a>
            <a href="#roadmap" className="hover:text-white transition-colors">Roadmap</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <Link
            href="/register"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Create Account
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Devnet Testing — Mainnet Launch December 2026
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3">
            Inside the <span className="text-blue-500">Crate</span>
          </h1>
          <p className="text-gray-400 text-xl mb-4">Idle Mining on Solana</p>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto mb-10">
            Autonomous robots extract resources from alien planets.
            Build your fleet, mine $CRATE, and compete for the top of the network.
          </p>

          <div className="flex items-center justify-center gap-4 mb-10">
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

          <div className="flex items-center justify-center gap-6">
            <a
              href="https://x.com/insidecrate"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              <XIcon />
              Follow @insidecrate
            </a>
            <a
              href="http://t.me/insideCrate"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#229ED9] text-sm transition-colors"
            >
              <TelegramIcon />
              Join Telegram
            </a>
          </div>
        </div>
      </section>

      {/* ── Game Preview (stylized UI mockups) ── */}
      <section className="pb-24 px-6" id="preview">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">

          {/* Mining panel */}
          <div className="bg-[#111118] border border-white/8 rounded-xl p-5 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Outpost — Mining</p>
            <div className="space-y-2">
              {[
                { name: 'Sentinel-01', rarity: 'COMMON', er: 10, dur: 95, color: 'bg-gray-500' },
                { name: 'Vulcan-03', rarity: 'RARE', er: 78, dur: 72, color: 'bg-blue-500' },
                { name: 'Nexus-07', rarity: 'EPIC', er: 195, dur: 88, color: 'bg-purple-500' },
              ].map((robot) => (
                <div key={robot.name} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <span className={`w-2 h-2 rounded-full ${robot.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white font-medium truncate">{robot.name}</span>
                      <span className="text-xs text-gray-500 shrink-0">{robot.er} ER</span>
                    </div>
                    <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500/70 rounded-full" style={{ width: `${robot.dur}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 pt-3 flex justify-between text-xs text-gray-500">
              <span>Total ER: <span className="text-white">283 HP</span></span>
              <span>Next block: <span className="text-indigo-400">8m 42s</span></span>
            </div>
          </div>

          {/* Lootbox panel */}
          <div className="bg-[#111118] border border-white/8 rounded-xl p-5 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Supply Crate — Drop Result</p>
            <div className="space-y-2">
              {[
                { name: 'Titan-02', label: 'Robot', rarity: 'UNCOMMON', color: 'text-green-400 bg-green-400/10' },
                { name: 'Arc Amplifier', label: 'Equipment', rarity: 'RARE', color: 'text-blue-400 bg-blue-400/10' },
                { name: 'Nano Shield', label: 'Base Upgrade', rarity: 'COMMON', color: 'text-gray-400 bg-gray-400/10' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.color}`}>
                    {item.rarity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 pt-3 text-xs text-gray-500 text-center">
              3 items received from 1 Supply Crate
            </div>
          </div>

          {/* Ranking panel */}
          <div className="bg-[#111118] border border-white/8 rounded-xl p-5 space-y-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Weekly Mining Race</p>
            <div className="space-y-2">
              {[
                { pos: 1, name: 'StarForge', er: '1,245 ER', reward: '3× Supply Crate', medal: 'text-yellow-400' },
                { pos: 2, name: 'CrateRunner', er: '980 ER', reward: '2× Supply Crate', medal: 'text-gray-300' },
                { pos: 3, name: 'VoidMiner', er: '750 ER', reward: '2× Supply Crate', medal: 'text-orange-400' },
              ].map((entry) => (
                <div key={entry.pos} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <span className={`text-sm font-bold w-5 text-center ${entry.medal}`}>#{entry.pos}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-white font-medium">{entry.name}</span>
                      <span className="text-xs text-gray-500">{entry.er}</span>
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-0.5">{entry.reward}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 pt-3 text-xs text-gray-500 text-center">
              Resets every Monday · Top 10 earn crate rewards
            </div>
          </div>

        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            label="Features"
            title="Everything in the game"
            sub="A complete idle gaming ecosystem built on Solana. No NFTs, no wallet connection, no barriers to entry."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Idle Mining',
                desc: 'Robots mine 24/7 automatically. Your extraction rate determines your share of every reward block, processed every 15 minutes.',
              },
              {
                title: '5 Minigames',
                desc: 'Space Drift, Serpentine, Orbital Jump, Capsule Drop, Space Bot. Win to boost your fleet\'s extraction rate for 24 hours.',
              },
              {
                title: 'Lootboxes',
                desc: 'Parts Crates and Supply Crates with transparent drop tables. Open up to 10 at once. Legendary items are crate-exclusive.',
              },
              {
                title: 'Crafting System',
                desc: 'Combine parts into equipment and base upgrades. Recipes are managed on-chain — new items added without game updates.',
              },
              {
                title: 'P2P Marketplace',
                desc: 'Buy and sell robots, equipment, and items with other players. All trades in $CRATE with a 5% fee that funds the reward pool.',
              },
              {
                title: 'Codex (Trophy Room)',
                desc: 'Register rare items permanently for bonus extraction rate. Complete collections unlock skins, titles, and Outpost slot bonuses.',
              },
              {
                title: 'Weekly Ranking',
                desc: 'Top 10 miners earn Supply and Parts Crates every Monday. Rankings reset weekly — every season is a fresh start.',
              },
              {
                title: 'Missions & Drops',
                desc: 'Dozens of objectives across mining, crafting, market and minigames. Free weekly drop for every active player every Monday.',
              },
              {
                title: 'Custodial Wallet',
                desc: 'No Phantom required. Each account gets a unique deposit address. Withdrawals processed daily by the team.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-[#111118] border border-white/8 rounded-xl p-5 hover:border-indigo-500/30 transition-colors"
              >
                <p className="text-sm font-semibold text-white mb-1.5">{f.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tokenomics ── */}
      <section id="tokenomics" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            label="Tokenomics"
            title="How $CRATE flows"
            sub="Community-funded with no team pre-allocation. Every $CRATE spent in the game flows back into the reward pool."
          />

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* Earn */}
            <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <p className="text-sm font-semibold text-white">Ways to earn $CRATE</p>
              </div>
              <div className="space-y-3">
                {EARN_SOURCES.map((s) => (
                  <div key={s.label} className="flex gap-3">
                    <span className="text-green-400 text-xs mt-0.5 shrink-0">+</span>
                    <div>
                      <p className="text-xs text-white font-medium">{s.label}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spend */}
            <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <p className="text-sm font-semibold text-white">Ways to spend $CRATE</p>
              </div>
              <div className="space-y-3">
                {SPEND_SINKS.map((s) => (
                  <div key={s.label} className="flex gap-3">
                    <span className="text-indigo-400 text-xs mt-0.5 shrink-0">−</span>
                    <div>
                      <p className="text-xs text-white font-medium">{s.label}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key facts */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: 'No Team Pre-allocation',
                desc: 'Community-funded model. The token launches via DegenSafe with no reserved team supply.',
              },
              {
                title: 'Deflationary Mechanics',
                desc: 'Codex registrations permanently remove items from circulation. 5% market fee and lootbox spend flow back to the reward pool.',
              },
              {
                title: 'Unidirectional Conversion',
                desc: 'SOL and LC Shib convert into $CRATE. Conversion is one-way — $CRATE cannot be converted back to SOL or LC.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-5">
                <p className="text-sm font-semibold text-indigo-300 mb-1.5">{f.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roadmap ── */}
      <section id="roadmap" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            label="Roadmap"
            title="Development timeline"
            sub="Five phases from infrastructure to mainnet launch. The full game is built on devnet — mainnet goes live December 2026."
          />

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/8 hidden md:block" />

            <div className="space-y-4">
              {ROADMAP_PHASES.map((phase) => {
                const isDone    = phase.status === 'done'
                const isCurrent = phase.status === 'current'
                return (
                  <div key={phase.phase} className="relative md:pl-16">
                    {/* Phase dot */}
                    <div className={`absolute left-4 top-5 w-4 h-4 rounded-full border-2 hidden md:block -translate-x-1/2 ${
                      isDone    ? 'border-green-600 bg-green-500/20' :
                      isCurrent ? 'border-yellow-500 bg-yellow-500/30' :
                                  'border-gray-700 bg-[#0a0a0f]'
                    }`} />

                    <div className={`bg-[#111118] border rounded-xl p-5 ${
                      isDone    ? 'border-green-900/50' :
                      isCurrent ? 'border-yellow-500/30' :
                                  'border-white/8'
                    }`}>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-xs font-mono text-gray-600">PHASE {phase.phase}</span>
                        <span className={`text-sm font-semibold ${
                          isDone    ? 'text-white' :
                          isCurrent ? 'text-yellow-400' :
                                      'text-gray-300'
                        }`}>
                          {phase.title}
                        </span>
                        <span className="text-xs text-gray-500">{phase.period}</span>
                        {isDone && (
                          <span className="text-[10px] font-semibold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                            ✓ Completed
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-semibold bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                            In Progress
                          </span>
                        )}
                      </div>
                      <ul className="space-y-1">
                        {phase.items.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className={`w-1 h-1 rounded-full shrink-0 ${
                              isDone    ? 'bg-green-600' :
                              isCurrent ? 'bg-yellow-400' :
                                          'bg-gray-600'
                            }`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <SectionHeading label="FAQ" title="Common questions" />

          <div className="space-y-2">
            {FAQS.map((item, i) => (
              <div
                key={i}
                className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-white">{item.q}</span>
                  <span className={`text-gray-500 shrink-0 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-gray-400 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Legal ── */}
      <section id="legal" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Legal Notices</p>
            <ul className="space-y-2">
              {LEGAL_ITEMS.map((item, i) => (
                <li key={i} className="flex gap-3 text-xs text-gray-500">
                  <span className="text-gray-700 shrink-0">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <span>
            Inside the <span className="text-blue-500">Crate</span> — Idle Mining on Solana
          </span>
          <div className="flex items-center gap-6">
            <a
              href="https://x.com/insidecrate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors flex items-center gap-1.5"
            >
              <XIcon /> @insidecrate
            </a>
            <a
              href="http://t.me/insideCrate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors flex items-center gap-1.5"
            >
              <TelegramIcon /> Telegram
            </a>
            <a href="#legal" className="hover:text-gray-400 transition-colors">Legal</a>
            <a href="#faq" className="hover:text-gray-400 transition-colors">FAQ</a>
          </div>
          <span>© {new Date().getFullYear()} Inside the Crate. All rights reserved.</span>
        </div>
      </footer>

    </div>
  )
}
