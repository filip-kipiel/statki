import { ROW_LABELS, COL_LABELS } from '../store/boardStore'
import type { PreviewCell } from '../store/usePlacement'

interface Props {
  // Komórki zajęte przez rozstawione statki
  occupiedCells: Set<string>
  // Podgląd statku przy hover (tryb rozstawiania)
  preview?: PreviewCell[]
  // Czy jest aktywny wybrany statek (zmienia kursor)
  hasSelected?: boolean
  // Callback kliknięcia i hover
  onCellClick?: (row: number, col: number) => void
  onCellHover?: (row: number, col: number) => void
  onMouseLeave?: () => void
}

// Wyznacza klasy CSS dla pojedynczej komórki
function cellClass(
  key: string,
  occupied: Set<string>,
  preview: PreviewCell[],
  hasSelected: boolean,
): string {
  const base = 'w-9 h-9 flex items-center justify-center border border-blue-900 select-none transition-all duration-100 text-sm font-bold rounded-sm'

  // Komórka podglądu (hover statku)
  const previewCell = preview.find(p => `${p.row},${p.col}` === key)
  if (previewCell) {
    return `${base} ${previewCell.valid ? 'bg-green-500 opacity-80' : 'bg-red-500 opacity-80'} cursor-crosshair`
  }

  // Zajęta przez rozstawiony statek
  if (occupied.has(key)) {
    return `${base} bg-gray-500 cursor-default`
  }

  // Puste pole
  const cursor = hasSelected ? 'cursor-crosshair' : 'cursor-default'
  return `${base} bg-blue-500 hover:bg-blue-300 ${cursor}`
}

export function Board({
  occupiedCells,
  preview = [],
  hasSelected = false,
  onCellClick,
  onCellHover,
  onMouseLeave,
}: Props) {
  return (
    <div
      className="bg-blue-950 p-4 rounded-xl shadow-2xl border border-blue-800 inline-block"
      onMouseLeave={onMouseLeave}
    >
      {/* Nagłówek kolumn */}
      <div className="flex ml-9 mb-1">
        {COL_LABELS.map(label => (
          <div key={label} className="w-9 text-center text-xs font-semibold text-blue-300">
            {label}
          </div>
        ))}
      </div>

      {/* Wiersze planszy */}
      {ROW_LABELS.map((rowLabel, ri) => (
        <div key={ri} className="flex items-center mb-0.5">
          {/* Etykieta wiersza */}
          <div className="w-8 text-center text-xs font-semibold text-blue-300 mr-1">
            {rowLabel}
          </div>

          {/* Komórki wiersza */}
          {COL_LABELS.map((_, ci) => {
            const key = `${ri},${ci}`
            return (
              <div
                key={ci}
                className={cellClass(key, occupiedCells, preview, hasSelected)}
                onClick={() => onCellClick?.(ri, ci)}
                onMouseEnter={() => onCellHover?.(ri, ci)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
