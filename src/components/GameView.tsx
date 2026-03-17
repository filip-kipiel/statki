import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { GameBoard } from './GameBoard'
import { FLEET } from '../store/boardStore'

interface Props {
  gameId: string
  myId: string
  opponentId: string
  myName: string
  onBackToLobby: () => void
}

// Formatuj sekundy jako "1m 23s"
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function GameView({ gameId, myId, opponentId, myName, onBackToLobby }: Props) {
  const {
    loading, isMyTurn, gameStatus, winner, winnerPoints,
    myShips, opponentShips,
    myShots, opponentShots,
    sunkOpponentCells, sunkMyCells,
    sunkOpponentCount, totalShots,
    shoot,
  } = useGame(gameId, myId, opponentId)

  // Pomiar czasu gry
  const startRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (gameStatus === 'finished') return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [gameStatus])

  // Powiadomienie o zatopieniu – pokazuj 2s gdy liczba rośnie
  const prevSunkRef = useRef(0)
  const [sunkMsg, setSunkMsg] = useState<string | null>(null)
  useEffect(() => {
    if (sunkOpponentCount > prevSunkRef.current) {
      prevSunkRef.current = sunkOpponentCount
      const def = FLEET[Math.min(sunkOpponentCount - 1, FLEET.length - 1)]
      setSunkMsg(`☠ Zatopiony ${def?.name ?? 'statek'}!`)
      const t = setTimeout(() => setSunkMsg(null), 2500)
      return () => clearTimeout(t)
    }
  }, [sunkOpponentCount])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Ładowanie gry…</p>
      </div>
    )
  }

  // --- Ekran końcowy ---
  if (gameStatus === 'finished') {
    const iWon = winner === myId
    const myTotalShots = totalShots
    const duration = Math.floor((Date.now() - startRef.current) / 1000)

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <div className="text-8xl">{iWon ? '🏆' : '💀'}</div>

          <h1 className={`text-5xl font-bold ${iWon ? 'text-yellow-400' : 'text-red-400'}`}>
            {iWon ? 'Wygrałeś!' : 'Przegrałeś!'}
          </h1>

          {/* Punkty */}
          {iWon && winnerPoints != null && (
            <div className="flex items-center gap-2 px-6 py-3 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
              <span className="text-2xl">⭐</span>
              <span className="text-yellow-300 font-bold text-xl">+{winnerPoints} {winnerPoints === 1 ? 'punkt' : winnerPoints < 5 ? 'punkty' : 'punktów'}</span>
            </div>
          )}

          {/* Statystyki */}
          <div className="w-full grid grid-cols-3 gap-3 mt-2">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Strzały</p>
              <p className="text-white text-2xl font-bold mt-1">{myTotalShots}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Zatopione</p>
              <p className="text-orange-400 text-2xl font-bold mt-1">{sunkOpponentCount}/{FLEET.reduce((s, d) => s + d.count, 0)}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Czas</p>
              <p className="text-white text-2xl font-bold mt-1">{formatDuration(duration)}</p>
            </div>
          </div>

          {/* Plansza końcowa – odkryj statki przeciwnika */}
          <div className="mt-2">
            <p className="text-gray-500 text-xs mb-2">Plansza przeciwnika</p>
            <GameBoard
              label=""
              ships={opponentShips}
              showShips={true}
              shots={myShots}
              sunkCells={sunkOpponentCells}
              isInteractive={false}
            />
          </div>

          <button
            onClick={onBackToLobby}
            className="w-full px-6 py-4 bg-blue-700 hover:bg-blue-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-900/30"
          >
            🔄 NOWA GRA
          </button>
        </div>
      </div>
    )
  }

  // --- Widok gry ---
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 gap-5">

      {/* Powiadomienie o zatopieniu */}
      {sunkMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-orange-900 border border-orange-600 text-orange-200 font-bold rounded-xl shadow-xl z-50 animate-bounce">
          {sunkMsg}
        </div>
      )}

      {/* Nagłówek */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">⚓ {myName}</h1>
        <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-semibold inline-block transition-all ${
          isMyTurn
            ? 'bg-green-900/60 text-green-300 border border-green-700'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}>
          {isMyTurn ? '🎯 Twoja tura – strzelaj!' : '⏳ Tura przeciwnika…'}
        </div>
      </div>

      {/* Dwie plansze */}
      <div className="flex gap-8 items-start flex-wrap justify-center">
        <GameBoard
          label="Moja flota"
          ships={myShips}
          showShips={true}
          shots={opponentShots}
          sunkCells={sunkMyCells}
          isInteractive={false}
        />
        <GameBoard
          label={isMyTurn ? '🎯 Plansza przeciwnika' : 'Plansza przeciwnika'}
          ships={opponentShips}
          showShips={false}
          shots={myShots}
          sunkCells={sunkOpponentCells}
          isInteractive={isMyTurn}
          onShoot={shoot}
        />
      </div>

      {/* Statystyki */}
      <div className="flex gap-6 text-sm text-gray-500">
        <span>Zatopione: <strong className="text-orange-400">{sunkOpponentCount}</strong>/{FLEET.reduce((s,d)=>s+d.count,0)}</span>
        <span>Strzały: <strong className="text-gray-300">{totalShots}</strong></span>
        <span>Czas: <strong className="text-gray-300">{formatDuration(elapsed)}</strong></span>
      </div>
    </div>
  )
}
