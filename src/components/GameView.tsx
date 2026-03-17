import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { useChat } from '../store/useChat'
import { GameBoard } from './GameBoard'
import { ChatBox } from './ChatBox'
import { FLEET } from '../store/boardStore'

interface Props {
  gameId:       string
  myId:         string
  opponentId:   string
  myName:       string
  opponentName: string
  onBackToLobby: () => void
  onRematch:    (newGameId: string, iAmPlayer1: boolean) => void
}

// Formatuj sekundy jako "1m 23s"
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function GameView({ gameId, myId, opponentId, myName, opponentName, onBackToLobby, onRematch }: Props) {
  const {
    loading, isMyTurn, gameStatus, winner, winnerPoints,
    myShips, opponentShips,
    myShots, opponentShots,
    sunkOpponentCells, sunkMyCells,
    sunkOpponentCount, totalShots,
    rematchGameId, newAchievements, shoot, proposeRematch,
  } = useGame(gameId, myId, opponentId)

  const { messages, sending, sendMessage } = useChat(gameId, myId)
  const [rematchProposed, setRematchProposed] = useState(false)

  // Pomiar czasu gry
  const startRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (gameStatus === 'finished') return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [gameStatus])

  // Timer tury (30s) – aktywny tylko gdy to moja tura
  const TURN_SECONDS = 60
  const [turnTimer, setTurnTimer] = useState(TURN_SECONDS)
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (gameStatus !== 'playing') return
    if (isMyTurn) {
      setTurnTimer(TURN_SECONDS)
      turnTimerRef.current = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            // Czas minął – auto-strzał w losowe pole
            const all: [number, number][] = []
            for (let r = 0; r < 10; r++)
              for (let c = 0; c < 10; c++)
                if (!myShots.has(`${r},${c}`)) all.push([r, c])
            if (all.length > 0) {
              const [r, c] = all[Math.floor(Math.random() * all.length)]
              void shoot(r, c)
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

          {/* Nowe odznaki */}
          {newAchievements.length > 0 && (
            <div className="w-full flex flex-col gap-2">
              <p className="text-yellow-400 font-bold text-center">🏅 Nowe odznaki!</p>
              {newAchievements.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
                  <span className="text-2xl">{a.emoji}</span>
                  <div>
                    <p className="text-white font-bold text-sm">{a.name}</p>
                    <p className="text-yellow-300 text-xs">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rewanż */}
          <div className="w-full flex flex-col gap-2">
            {/* Przeciwnik zaproponował rewanż */}
            {rematchGameId && !rematchProposed && (
              <button
                onClick={() => onRematch(rematchGameId, false)}
                className="w-full px-6 py-4 bg-green-700 hover:bg-green-600 text-white font-bold text-lg rounded-xl transition-all animate-pulse"
              >
                ⚔️ Rewanż od {opponentName}! Akceptuj
              </button>
            )}
            {/* Zaproponuj rewanż */}
            {!rematchGameId && (
              <button
                onClick={async () => {
                  setRematchProposed(true)
                  const r = await proposeRematch()
                  if (r) onRematch(r.newGameId, true)
                }}
                disabled={rematchProposed}
                className="w-full px-6 py-4 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 text-white font-bold text-lg rounded-xl transition-all"
              >
                {rematchProposed ? '⏳ Czekam na rewanż…' : '⚔️ REWANŻ'}
              </button>
            )}
            <button
              onClick={onBackToLobby}
              className="w-full px-6 py-4 bg-blue-700 hover:bg-blue-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-900/30"
            >
              🔄 NOWA GRA
            </button>
          </div>
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
        <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-all ${
          isMyTurn
            ? 'bg-green-900/60 text-green-300 border border-green-700'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}>
          {isMyTurn ? '🎯 Twoja tura – strzelaj!' : '⏳ Tura przeciwnika…'}
          {isMyTurn && (
            <span className={`font-mono font-bold ${turnTimer <= 10 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {turnTimer}s
            </span>
          )}
        </div>
      </div>

      {/* Dwie plansze */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center sm:items-start justify-center">
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

      {/* Czat */}
      <ChatBox
        messages={messages}
        myId={myId}
        myName={myName}
        opponentName={opponentName}
        sending={sending}
        onSend={sendMessage}
      />
    </div>
  )
}
