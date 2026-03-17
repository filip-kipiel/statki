import { useState } from 'react'
import { Lobby } from './components/Lobby'
import type { PlayerRole } from './components/Lobby'
import { Board } from './components/Board'
import { ShipPanel } from './components/ShipPanel'
import { usePlacement } from './store/usePlacement'

type Phase = 'lobby' | 'placement' | 'ready'

interface GameSession {
  gameId: string
  playerId: string
  playerName: string
  role: PlayerRole
}

function App() {
  const [phase, setPhase]     = useState<Phase>('lobby')
  const [session, setSession] = useState<GameSession | null>(null)

  const placement = usePlacement()

  function handleGameReady(gameId: string, playerId: string, playerName: string, role: PlayerRole) {
    setSession({ gameId, playerId, playerName, role })
    placement.reset()
    setPhase('placement')
  }

  // --- Lobby ---
  if (phase === 'lobby') {
    return <Lobby onGameReady={handleGameReady} />
  }

  // --- Ekran "Gotowi – czekamy na przeciwnika" ---
  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4">
          <h1 className="text-4xl font-bold text-green-400">Flota rozstawiona!</h1>
          <p className="text-gray-400">Czekamy aż przeciwnik skończy rozstawianie…</p>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
            Synchronizacja…
          </div>
          <button
            onClick={() => setPhase('placement')}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm transition-all"
          >
            ← Wróć do rozstawiania
          </button>
        </div>
      </div>
    )
  }

  // --- Rozstawianie statków ---
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Statki – Multiplayer</h1>
        <p className="text-blue-300 text-sm mt-1">
          {session?.playerName} · Rozstaw swoją flotę
          <span className="ml-3 text-gray-600 font-mono text-xs">{session?.gameId.slice(0, 8)}</span>
        </p>
      </div>

      <div className="flex gap-8 items-start">
        <Board
          occupiedCells={placement.getOccupiedSet()}
          preview={placement.preview}
          hasSelected={placement.selected !== null}
          onCellClick={(r, c) => placement.placeShip(r, c)}
          onCellHover={(r, c) => placement.setHoverPos({ row: r, col: c })}
          onMouseLeave={() => placement.setHoverPos(null)}
        />
        <ShipPanel
          placed={placement.placed}
          selected={placement.selected}
          horizontal={placement.horizontal}
          allPlaced={placement.allPlaced}
          onSelect={placement.selectShip}
          onToggleOrientation={placement.toggleOrientation}
          onRandomize={placement.randomize}
          onReset={placement.reset}
          onReady={() => setPhase('ready')}
        />
      </div>
    </div>
  )
}

export default App
