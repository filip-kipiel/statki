import { useState } from 'react'
import { Board } from './components/Board'
import { ShipPanel } from './components/ShipPanel'
import { usePlacement } from './store/usePlacement'

type Phase = 'placement' | 'ready'

function App() {
  const [phase, setPhase] = useState<Phase>('placement')

  const {
    placed,
    selected,
    horizontal,
    allPlaced,
    preview,
    getOccupiedSet,
    selectShip,
    toggleOrientation,
    setHoverPos,
    placeShip,
    randomize,
    reset,
  } = usePlacement()

  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-400 mb-4">Statki gotowe!</h1>
          <p className="text-gray-400 mb-6">Czekamy na przeciwnika…</p>
          <button
            onClick={() => setPhase('placement')}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
          >
            ← Wróć do rozstawiania
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-3xl font-bold text-white tracking-wide">Statki – Multiplayer</h1>
      <p className="text-blue-300 text-sm">Rozstaw swoją flotę</p>

      <div className="flex gap-8 items-start">
        {/* Plansza */}
        <Board
          occupiedCells={getOccupiedSet()}
          preview={preview}
          hasSelected={selected !== null}
          onCellClick={(r, c) => placeShip(r, c)}
          onCellHover={(r, c) => setHoverPos({ row: r, col: c })}
          onMouseLeave={() => setHoverPos(null)}
        />

        {/* Panel boczny */}
        <ShipPanel
          placed={placed}
          selected={selected}
          horizontal={horizontal}
          allPlaced={allPlaced}
          onSelect={selectShip}
          onToggleOrientation={toggleOrientation}
          onRandomize={randomize}
          onReset={reset}
          onReady={() => setPhase('ready')}
        />
      </div>
    </div>
  )
}

export default App
