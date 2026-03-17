import { FLEET } from '../store/boardStore'
import type { PlacedShip, ShipDef } from '../store/boardStore'

interface Props {
  placed: PlacedShip[]
  selected: ShipDef | null
  horizontal: boolean
  allPlaced: boolean
  onSelect: (def: ShipDef) => void
  onToggleOrientation: () => void
  onRandomize: () => void
  onReset: () => void
  onReady: () => void
}

// Wizualizacja długości statku jako kresek
function ShipShape({ size }: { size: number }) {
  return (
    <div className="flex flex-row gap-0.5">
      {Array.from({ length: size }).map((_, i) => (
        <div key={i} className="w-2.5 h-2.5 bg-gray-400 rounded-sm shrink-0" />
      ))}
    </div>
  )
}

export function ShipPanel({
  placed, selected, horizontal, allPlaced,
  onSelect, onToggleOrientation, onRandomize, onReset, onReady,
}: Props) {
  const remaining = FLEET.reduce((s, d) => s + d.count, 0) - placed.length

  return (
    // Na mobile: poziomy pasek na dole; na sm+: pionowy panel z boku
    <div className="flex flex-row sm:flex-col flex-wrap gap-2 sm:gap-4 sm:w-52 w-full">

      {/* Lista statków */}
      <div className="flex flex-row sm:flex-col gap-1 sm:gap-2 flex-wrap">
        {FLEET.map(def => {
          const placedCount = placed.filter(p => p.defId === def.id).length
          return Array.from({ length: def.count }).map((_, idx) => {
            const isPlaced   = idx < placedCount
            const isSelected = !isPlaced && selected?.id === def.id && idx === placedCount
            return (
              <button
                key={`${def.id}-${idx}`}
                disabled={isPlaced}
                onClick={() => !isPlaced && onSelect(def)}
                title={def.name}
                className={[
                  'flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all text-left',
                  isPlaced
                    ? 'border-gray-700 bg-gray-800 opacity-40 cursor-default'
                    : isSelected
                      ? 'border-blue-400 bg-blue-900 ring-2 ring-blue-400 cursor-pointer'
                      : 'border-gray-600 bg-gray-800 hover:border-gray-400 cursor-pointer',
                ].join(' ')}
              >
                <div className="flex items-center shrink-0">
                  <ShipShape size={def.size} />
                </div>
                <span className="text-white text-xs sm:text-sm font-medium hidden sm:block">{def.name}</span>
                {isPlaced && <span className="ml-auto text-green-400 text-sm">✓</span>}
              </button>
            )
          })
        })}
      </div>

      {/* Akcje */}
      <div className="flex flex-row sm:flex-col gap-1 sm:gap-2 items-center sm:items-stretch flex-wrap">
        {selected && (
          <button
            onClick={onToggleOrientation}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-yellow-600 bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/70 transition-all text-xs sm:text-sm font-medium"
          >
            <span>↻</span>
            <span className="hidden sm:inline">OBRÓĆ (R)</span>
            <span className="text-xs opacity-70">{horizontal ? '→' : '↓'}</span>
          </button>
        )}

        <button
          onClick={onRandomize}
          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all text-xs sm:text-sm"
        >
          🎲 <span className="hidden sm:inline">LOSOWE</span>
        </button>

        {placed.length > 0 && (
          <button
            onClick={onReset}
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all text-xs sm:text-sm"
          >
            ✕ <span className="hidden sm:inline">RESETUJ</span>
          </button>
        )}

        <button
          disabled={!allPlaced}
          onClick={onReady}
          className={[
            'px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all',
            allPlaced
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50 cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed',
          ].join(' ')}
        >
          {allPlaced ? '✅ GOTOWY!' : `(${remaining})`}
        </button>
      </div>
    </div>
  )
}
