import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
          Inside the <span className="text-blue-500">Crate</span>
        </h1>
        <p className="text-gray-400 text-lg mb-2">Idle Mining</p>
        <p className="text-gray-500 text-sm mb-10">
          Robôs autônomos extraem recursos de planetas alienígenas. Expanda sua frota, mine $CRATE e compita na rede.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Começar a jogar
          </Link>
          <Link
            href="/login"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Entrar
          </Link>
        </div>

        <p className="text-gray-700 text-xs mt-12">
          $CRATE é um token de utilidade. Não constitui investimento. Lançamento: Dezembro 2026.
        </p>
      </div>
    </div>
  )
}
