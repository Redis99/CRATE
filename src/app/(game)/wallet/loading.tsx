function Pulse({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function WalletLoading() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 space-y-2">
        <Pulse w="w-28" h="h-8" />
        <Pulse w="w-56" h="h-4" />
      </div>
      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-4 space-y-2 animate-pulse">
            <Pulse w="w-16" h="h-3" />
            <Pulse w="w-24" h="h-7" />
          </div>
        ))}
      </div>
      {/* Deposit panel */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 mb-4 space-y-3 animate-pulse">
        <Pulse w="w-32" h="h-5" />
        <div className="flex justify-center py-4">
          <div className="w-40 h-40 bg-[#0d0d15] rounded-xl" />
        </div>
        <Pulse w="w-full" h="h-10" />
      </div>
      {/* Transactions */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between items-center p-3 bg-[#111118] rounded-lg animate-pulse">
            <div className="space-y-1.5">
              <Pulse w="w-24" h="h-3" />
              <Pulse w="w-32" h="h-2.5" />
            </div>
            <Pulse w="w-20" h="h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}
