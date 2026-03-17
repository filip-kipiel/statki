import { ROW_LABELS, COL_LABELS } from '../store/boardStore'
import type { PlacedShip } from '../store/boardStore'
import { FLEET, shipCells } from '../store/boardStore'

interface Props {
  label: string
  ships: PlacedShip[]
  showShips: boolean                          // true = moja plansza, false = plansza przeciwnika
  shots: Map<string, 'hit' | 'miss'>          // strzały na tę planszę
  sunkCells?: Set<string>                     // pola zatopionych statków
  isInteractive: boolean                      // czy można klikać
  onShoot?: (row: number, col: number) => void
}

// Zestaw pól zajętych przez statki
function buildShipSet(ships: PlacedShip[]): Set<string> {
  const s = new Set<string>()
  for (const ship of ships) {
    const def = FLEET.find(d => d.id === ship.defId)!
    for (const [r, c] of shipCells(ship, def.size)) s.add(`${r},${c}`)
  }
  return s
}

// Klasy CSS komórki
function cellClass(
  key: string,
  shipSet: Set<string>,
  shots: Map<string, 'hit' | 'miss'>,
  sunkCells: Set<string>,
  showShips: boolean,
  interactive: boolean,
): string {
  const base = 'w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center border select-none transition-colors duration-100 text-xs sm:text-sm rounded-sm'

  // Zatopiony statek – ciemnopomarańczowe tło
  if (sunkCells.has(key)) return `${base} bg-orange-800 border-orange-600 cursor-default`

  const shotResult = shots.get(key)
  if (shotResult === 'hit')  return `${base} bg-red-600 border-red-800 cursor-default`
  if (shotResult === 'miss') return `${base} bg-slate-200 border-slate-300 text-slate-500 cursor-default`

  const hasShip = shipSet.has(key)
  if (showShips && hasShip) return `${base} bg-gray-500 border-gray-600 cursor-default`

  if (interactive) return `${base} bg-blue-500 border-blue-900 hover:bg-blue-300 cursor-crosshair`
  return `${base} bg-blue-500 border-blue-900 cursor-default`
}

export function GameBoard({ label, ships, showShips, shots, sunkCells = new Set(), isInteractive, onShoot }: Props) {
  const shipSet = buildShipSet(ships)

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <div className="bg-blue-950 p-3 rounded-xl border border-blue-800 shadow-xl">
        {/* Nagłówek kolumn */}
        <div className="flex ml-6 sm:ml-8 mb-1">
          {COL_LABELS.map(l => (
            <div key={l} className="w-7 sm:w-9 text-center text-[10px] sm:text-xs font-semibold text-blue-400">{l}</div>
          ))}
        </div>

        {/* Wiersze */}
        {ROW_LABELS.map((rowLabel, ri) => (
          <div key={ri} className="flex items-center mb-0.5">
            <div className="w-5 sm:w-7 text-center text-[10px] sm:text-xs font-semibold text-blue-400 mr-0.5 sm:mr-1">{rowLabel}</div>
            {COL_LABELS.map((_, ci) => {
              const key = `${ri},${ci}`
              const shot = shots.get(key)
              const isSunk = sunkCells.has(key)
              return (
                <div
                  key={ci}
                  className={cellClass(key, shipSet, shots, sunkCells, showShips, isInteractive && !shot)}
                  onClick={() => isInteractive && !shot && onShoot?.(ri, ci)}
                >
                  {isSunk                    && <span className="text-orange-300 text-xs">☠</span>}
                  {!isSunk && shot === 'hit'  && <span className="text-white text-xs">💥</span>}
                  {!isSunk && shot === 'miss' && <span className="text-slate-400 font-bold text-xs">·</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
