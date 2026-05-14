// Fallback genérico para todas as páginas do game group
// Aparece enquanto qualquer Server Component está buscando dados

function SkeletonBlock({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function GameLoading() {
  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <SkeletonBlock w="w-48" h="h-8" />
        <SkeletonBlock w="w-72" h="h-4" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-4 space-y-3 animate-pulse">
            <div className="flex justify-between">
              <SkeletonBlock w="w-24" h="h-3" />
              <SkeletonBlock w="w-5" h="h-5" />
            </div>
            <SkeletonBlock w="w-20" h="h-7" />
            <SkeletonBlock w="w-32" h="h-3" />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-[#111118] border border-gray-800/60 rounded-xl p-5 space-y-3 animate-pulse">
          <SkeletonBlock w="w-40" h="h-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#0d0d15]">
              <SkeletonBlock w="w-10" h="h-10" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock w="w-32" h="h-3" />
                <SkeletonBlock w="w-48" h="h-3" />
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-2 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 space-y-3 animate-pulse">
              <SkeletonBlock w="w-28" h="h-4" />
              <SkeletonBlock w="w-full" h="h-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
