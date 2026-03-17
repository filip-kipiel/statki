import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Lobby } from './components/Lobby'
import type { PlayerRole } from './components/Lobby'
import { Board } from './components/Board'
import { ShipPanel } from './components/ShipPanel'
import { GameView } from './components/GameView'
import { usePlacement } from './store/usePlacement'
import type { PlacedShip } from './store/boardStore'

type Phase = 'lobby' | 'placement' | 'waiting_opponent' | 'playing'

interface GameSession {
  gameId: string
  playerId: string
  playerName: string
  role: PlayerRole
  opponentId: string
}

export default function App() {
  const [phase, setPhase]     = useState<Phase>('lobby')
  const [session, setSession] = useState<GameSession | null>(null)
  const placement = usePlacement()

  // Nasłuchiwanie na status 'playing' gdy czekamy na przeciwnika (faza waiting_opponent)
  useEffect(() => {
    if (phase !== 'waiting_opponent' || !session) return

    const ch = supabase
      .channel(`app-game-${session.gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games',
        filter: `id=eq.${session.gameId}`,
      }, payload => {
        const g = payload.new as { status: string }
        if (g.status === 'playing') setPhase('playing')
      })
      .subscribe()

    return () => { void supabase.removeChannel(ch) }
  }, [phase, session])

  // Callback z Lobby – oboje gracze wiedzą kto jest kim
  function handleGameReady(
    gameId: string, playerId: string, playerName: string,
    role: PlayerRole, opponentId: string,
  ) {
    setSession({ gameId, playerId, playerName, role, opponentId })
    placement.reset()
    setPhase('placement')
  }

  // Kliknięcie GOTOWY w panelu statków
  async function handleReady(placed: PlacedShip[]) {
    if (!session) return

    // Zapisz planszę w bazie
    const { error: boardErr } = await supabase.from('boards').upsert({
      game_id: session.gameId,
      player_id: session.playerId,
      ships: placed,
      ready: true,
    })
    if (boardErr) { console.error('[App] Błąd zapisu planszy:', boardErr); return }

    // Sprawdź czy przeciwnik też już gotowy
    const { data: oppBoard } = await supabase
      .from('boards')
      .select('ready')
      .eq('game_id', session.gameId)
      .eq('player_id', session.opponentId)
      .eq('ready', true)
      .maybeSingle()

    if (oppBoard) {
      // Obaj gotowi – uruchom grę (player1 zaczyna)
      const firstTurn = session.role === 'player1' ? session.playerId : session.opponentId
      await supabase.from('games')
        .update({ status: 'playing', current_turn: firstTurn })
        .eq('id', session.gameId)
      setPhase('playing')
    } else {
      // Czekamy na przeciwnika – subskrypcja w useEffect
      setPhase('waiting_opponent')
    }
  }

  // --- LOBBY ---
  if (phase === 'lobby') {
    return <Lobby onGameReady={handleGameReady} />
  }

  // --- ROZSTAWIANIE STATKÓW ---
  if (phase === 'placement') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Statki – Multiplayer</h1>
          <p className="text-blue-300 text-sm mt-1">
            {session?.playerName} · Rozstaw swoją flotę
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
            onReady={() => handleReady(placement.placed)}
          />
        </div>
      </div>
    )
  }

  // --- OCZEKIWANIE NA GOTOWOŚĆ PRZECIWNIKA ---
  if (phase === 'waiting_opponent') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Flota rozstawiona! ✅</h2>
          <p className="text-gray-400">Czekamy aż przeciwnik skończy rozstawianie…</p>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
            Synchronizacja przez Supabase Realtime…
          </div>
          <button
            onClick={() => setPhase('placement')}
            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 rounded-lg text-sm transition-all"
          >
            ← Wróć do rozstawiania
          </button>
        </div>
      </div>
    )
  }

  // --- GRA ---
  return (
    <GameView
      gameId={session!.gameId}
      myId={session!.playerId}
      opponentId={session!.opponentId}
      myName={session!.playerName}
      onBackToLobby={() => {
        setSession(null)
        placement.reset()
        setPhase('lobby')
      }}
    />
  )
}
