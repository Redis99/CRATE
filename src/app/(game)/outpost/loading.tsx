function Pulse({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function OutpostLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 space-y-2">
        <Pulse w="w-36" h="h-8" />
        <Pulse w="w-64" h="h-4" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-4 space-y-2 animate-pulse">
            <Pulse w="w-20" h="h-3" />
            <Pulse w="w-12" h="h-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-4 space-y-3 animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-[#0d0d15] rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Pulse w="w-32" h="h-3" />
                <Pulse w="w-48" h="h-2.5" />
              </div>
            </div>
            <div className="h-2 bg-[#0d0d15] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
