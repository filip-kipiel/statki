import { FLEET, PlacedShip, ShipDef } from '../store/boardStore'

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
function ShipShape({ size, horizontal }: { size: number; horizontal: boolean }) {
  const cells = Array.from({ length: size })
  return (
    <div className={`flex ${horizontal ? 'flex-row' : 'flex-col'} gap-0.5`}>
      {cells.map((_, i) => (
        <div key={i} className="w-4 h-4 bg-gray-400 rounded-sm" />
      ))}
    </div>
  )
}

export function ShipPanel({
  placed, selected, horizontal, allPlaced,
  onSelect, onToggleOrientation, onRandomize, onReset, onReady,
}: Props) {
  return (
    <div className="flex flex-col gap-4 w-52">
      <h2 className="text-white font-bold text-lg">Twoja flota</h2>

      {/* Lista statków */}
      <div className="flex flex-col gap-2">
        {FLEET.map(def => {
          const placedCount = placed.filter(p => p.defId === def.id).length
          const totalCount  = def.count

          return Array.from({ length: totalCount }).map((_, idx) => {
            const isPlaced   = idx < placedCount
            const isSelected = !isPlaced && selected?.id === def.id && idx === placedCount

            return (
              <button
                key={`${def.id}-${idx}`}
                disabled={isPlaced}
                onClick={() => !isPlaced && onSelect(def)}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left',
                  isPlaced
                    ? 'border-gray-700 bg-gray-800 opacity-40 cursor-default'
                    : isSelected
                      ? 'border-blue-400 bg-blue-900 ring-2 ring-blue-400 cursor-pointer'
                      : 'border-gray-600 bg-gray-800 hover:border-gray-400 cursor-pointer',
                ].join(' ')}
              >
                {/* Miniaturka statku */}
                <div className="w-10 flex items-center justify-center shrink-0">
                  <ShipShape size={def.size} horizontal={true} />
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-white text-sm font-medium">{def.name}</span>
                  <span className="text-gray-400 text-xs">{def.size} {def.size === 1 ? 'pole' : def.size < 5 ? 'pola' : 'pól'}</span>
                </div>

                {/* Znacznik ukończenia */}
                {isPlaced && <span className="ml-auto text-green-400 text-lg">✓</span>}
              </button>
            )
          })
        })}
      </div>

      {/* Przycisk obrotu */}
      {selected && (
        <div className="flex flex-col gap-1">
          <button
            onClick={onToggleOrientation}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-yellow-600 bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/70 transition-all text-sm font-medium"
          >
            <span>↻</span>
            <span>OBRÓĆ (R)</span>
            <span className="ml-auto text-xs opacity-70">{horizontal ? '→' : '↓'}</span>
          </button>
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-gray-700" />

      {/* Losowe rozmieszczenie */}
      <button
        onClick={onRandomize}
        className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all text-sm"
      >
        🎲 LOSOWE ROZMIESZCZENIE
      </button>

      {/* Reset */}
      {placed.length > 0 && (
        <button
          onClick={onReset}
          className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all text-sm"
        >
          ✕ RESETUJ
        </button>
      )}

      {/* Przycisk GOTOWY */}
      <button
        disabled={!allPlaced}
        onClick={onReady}
        className={[
          'mt-2 px-4 py-3 rounded-xl font-bold text-base transition-all',
          allPlaced
            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/50 cursor-pointer'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed',
        ].join(' ')}
      >
        {allPlaced ? '✅ GOTOWY!' : `Zostało ${placed.length === 0 ? 'rozstawić statki' : `jeszcze ${FLEET.reduce((s, d) => s + d.count, 0) - placed.length}`}`}
      </button>
    </div>
  )
}
