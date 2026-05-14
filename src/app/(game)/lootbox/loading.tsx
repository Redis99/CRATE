function Pulse({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function LootboxLoading() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 space-y-2">
        <Pulse w="w-36" h="h-8" />
        <Pulse w="w-72" h="h-4" />
      </div>
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl px-5 py-3 mb-5 animate-pulse">
        <Pulse w="w-48" h="h-4" />
      </div>
      <div className="h-8 bg-[#111118] rounded-xl mb-5 animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 space-y-4 animate-pulse">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <Pulse w="w-28" h="h-5" />
                <Pulse w="w-48" h="h-3" />
              </div>
              <div className="space-y-1">
                <Pulse w="w-16" h="h-3" />
                <Pulse w="w-24" h="h-5" />
              </div>
            </div>
            <Pulse w="w-full" h="h-10" />
            <Pulse w="w-full" h="h-10" />
          </div>
        ))}
      </div>
    </div>
  )
}
