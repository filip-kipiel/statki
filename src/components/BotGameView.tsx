import { useEffect, useRef, useState } from 'react'
import { useBotGame } from '../store/useBotGame'
import type { BotDifficulty } from '../store/useBotGame'
import { GameBoard } from './GameBoard'
import { FLEET } from '../store/boardStore'
import type { PlacedShip } from '../store/boardStore'

interface Props {
  myShips:    PlacedShip[]
  difficulty: BotDifficulty
  myName:     string
  onBack:     () => void
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

const DIFFICULTY_LABEL: Record<BotDifficulty, string> = {
  easy:   '🟢 Łatwy',
  medium: '🟡 Średni',
  hard:   '🔴 Trudny',
  hunter: '💀 Hunter',
}

const TOTAL_FLEET = FLEET.reduce((s, d) => s + d.count, 0)

export function BotGameView({ myShips, difficulty, myName, onBack }: Props) {
  const {
    isMyTurn, gameStatus, winner,
    myShips: ships, botShips,
    myShots, opponentShots,
    sunkOpponentCells, sunkMyCells,
    sunkOpponentCount, totalShots,
    shoot,
  } = useBotGame(myShips, difficulty)

  const startRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (gameStatus === 'finished') return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [gameStatus])

  // Timer tury (30s)
  const TURN_SECONDS = 30
  const [turnTimer, setTurnTimer] = useState(TURN_SECONDS)
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (gameStatus !== 'playing') return
    if (isMyTurn) {
      setTurnTimer(TURN_SECONDS)
      turnTimerRef.current = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            const all: [number, number][] = []
            for (let r = 0; r < 10; r++)
              for (let c = 0; c < 10; c++)
                if (!myShots.has(`${r},${c}`)) all.push([r, c])
            if (all.length > 0) {
              const [r, c] = all[Math.floor(Math.random() * all.length)]
              shoot(r, c)
            }
            return TURN_SECONDS
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current)
    }
    return () => { if (turnTimerRef.current) clearInterval(turnTimerRef.current) }
  }, [isMyTurn, gameStatus])

  // Powiadomienie o zatopieniu
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

  // --- Ekran końcowy ---
  if (gameStatus === 'finished') {
    const iWon    = winner === 'player'
    const duration = Math.floor((Date.now() - startRef.current) / 1000)

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <div className="text-8xl">{iWon ? '🏆' : '💀'}</div>

          <h1 className={`text-5xl font-bold ${iWon ? 'text-yellow-400' : 'text-red-400'}`}>
            {iWon ? 'Wygrałeś!' : 'Przegrałeś!'}
          </h1>

          <p className="text-gray-500 text-sm">
            Poziom bota: {DIFFICULTY_LABEL[difficulty]}
          </p>

          <div className="w-full grid grid-cols-3 gap-3 mt-2">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Strzały</p>
              <p className="text-white text-2xl font-bold mt-1">{totalShots}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Zatopione</p>
              <p className="text-orange-400 text-2xl font-bold mt-1">{sunkOpponentCount}/{TOTAL_FLEET}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Czas</p>
              <p className="text-white text-2xl font-bold mt-1">{formatDuration(duration)}</p>
            </div>
          </div>

          <div className="mt-2">
            <p className="text-gray-500 text-xs mb-2">Plansza bota</p>
            <GameBoard
              label=""
              ships={botShips}
              showShips={true}
              shots={myShots}
              sunkCells={sunkOpponentCells}
              isInteractive={false}
            />
          </div>

          <button
            onClick={onBack}
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

      {sunkMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-orange-900 border border-orange-600 text-orange-200 font-bold rounded-xl shadow-xl z-50 animate-bounce">
          {sunkMsg}
        </div>
      )}

      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">⚓ {myName} vs Bot ({DIFFICULTY_LABEL[difficulty]})</h1>
        <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-all ${
          isMyTurn
            ? 'bg-green-900/60 text-green-300 border border-green-700'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}>
          {isMyTurn ? '🎯 Twoja tura – strzelaj!' : '🤖 Bot myśli…'}
          {isMyTurn && (
            <span className={`font-mono font-bold ${turnTimer <= 10 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {turnTimer}s
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center sm:items-start justify-center">
        <GameBoard
          label="Moja flota"
          ships={ships}
          showShips={true}
          shots={opponentShots}
          sunkCells={sunkMyCells}
          isInteractive={false}
        />
        <GameBoard
          label={isMyTurn ? '🎯 Plansza bota' : 'Plansza bota'}
          ships={botShips}
          showShips={false}
          shots={myShots}
          sunkCells={sunkOpponentCells}
          isInteractive={isMyTurn}
          onShoot={shoot}
        />
      </div>

      <div className="flex gap-6 text-sm text-gray-500">
        <span>Zatopione: <strong className="text-orange-400">{sunkOpponentCount}</strong>/{TOTAL_FLEET}</span>
        <span>Strzały: <strong className="text-gray-300">{totalShots}</strong></span>
        <span>Czas: <strong className="text-gray-300">{formatDuration(elapsed)}</strong></span>
      </div>
    </div>
  )
}
