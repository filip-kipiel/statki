import { useState } from 'react'
import { createTestBoard, ROW_LABELS, COL_LABELS } from '../store/boardStore'
import type { CellState } from '../store/boardStore'

// Kolory pól w zależności od stanu
function cellClasses(state: CellState, hovered: boolean): string {
  const base = 'w-9 h-9 flex items-center justify-center border border-blue-900 cursor-pointer select-none transition-all duration-150 text-sm font-bold rounded-sm'

  if (hovered) {
    if (state === 'empty') return `${base} bg-blue-300`
    if (state === 'ship')  return `${base} bg-gray-400`
  }

  if (state === 'empty') return `${base} bg-blue-500`
  if (state === 'ship')  return `${base} bg-gray-500`
  if (state === 'hit')   return `${base} bg-red-500`
  if (state === 'miss')  return `${base} bg-white text-gray-500`
  return base
}

export function Board() {
  const [board, setBoard] = useState(() => createTestBoard())
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  // Kliknięcie zmienia stan pola: puste→pudło, statek→trafiony
  function handleClick(row: number, col: number) {
    setBoard(prev => prev.map((r, ri) =>
      r.map((cell, ci) => {
        if (ri !== row || ci !== col) return cell
        if (cell.state === 'empty') return { ...cell, state: 'miss' as const }
        if (cell.state === 'ship')  return { ...cell, state: 'hit' as const }
        return cell
      })
    ))
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-white tracking-wide">Statki – Multiplayer</h1>

      <div className="bg-blue-950 p-4 rounded-xl shadow-2xl border border-blue-800">
        {/* Nagłówek kolumn */}
        <div className="flex ml-9 mb-1">
          {COL_LABELS.map(label => (
            <div key={label} className="w-9 text-center text-xs font-semibold text-blue-300">
              {label}
            </div>
          ))}
        </div>

        {/* Wiersze planszy */}
        {board.map((row, ri) => (
          <div key={ri} className="flex items-center mb-0.5">
            {/* Etykieta wiersza */}
            <div className="w-8 text-center text-xs font-semibold text-blue-300 mr-1">
              {ROW_LABELS[ri]}
            </div>

            {/* Pola wiersza */}
            {row.map((cell, ci) => {
              const key = `${ri}-${ci}`
              const isHovered = hoveredCell === key
              return (
                <div
                  key={ci}
                  className={cellClasses(cell.state, isHovered)}
                  onClick={() => handleClick(ri, ci)}
                  onMouseEnter={() => setHoveredCell(key)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {/* Krzyżyk dla pudła */}
                  {cell.state === 'miss' && '✕'}
                  {/* Płomień dla trafienia */}
                  {cell.state === 'hit' && '💥'}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-blue-500 rounded-sm inline-block"/>puste</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gray-500 rounded-sm inline-block"/>statek</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-red-500 rounded-sm inline-block"/>trafiony</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 bg-white rounded-sm inline-block"/>pudło</span>
      </div>
    </div>
  )
}
