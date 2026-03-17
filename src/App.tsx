import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AuthPage } from './components/AuthPage'
import { HomePage } from './components/HomePage'
import { AdminPanel } from './components/AdminPanel'
import { Lobby } from './components/Lobby'
import type { PlayerRole } from './components/Lobby'
import { Board } from './components/Board'
import { ShipPanel } from './components/ShipPanel'
import { GameView } from './components/GameView'
import { BotGameView } from './components/BotGameView'
import { usePlacement } from './store/usePlacement'
import type { PlacedShip } from './store/boardStore'
import type { BotDifficulty } from './store/useBotGame'

type Phase = 'auth' | 'home' | 'admin' | 'lobby' | 'placement' | 'waiting_opponent' | 'playing' | 'bot'

interface GameSession {
  gameId:      string
  playerId:    string
  playerName:  string
  role:        PlayerRole
  opponentId:  string
}

export default function App() {
  const [phase, setPhase]           = useState<Phase>('auth')
  const [userId, setUserId]         = useState<string | null>(null)
  const [username, setUsername]     = useState<string>('')
  const [isAdmin, setIsAdmin]       = useState(false)
  const [session, setSession]       = useState<GameSession | null>(null)
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('easy')
  const [isBotGame,     setIsBotGame]     = useState(false)
  const [myPlacedShips, setMyPlacedShips] = useState<PlacedShip[]>([])
  const placement = usePlacement()

  // Sprawdź istniejącą sesję Supabase Auth przy starcie
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const uid = data.session.user.id
        supabase.from('profiles').select('username, is_admin').eq('id', uid).single()
          .then(({ data: profile }) => {
            setUserId(uid)
            setUsername(profile?.username ?? '')
            setIsAdmin(profile?.is_admin ?? false)
            setPhase('home')
          })
      }
    })
  }, [])

  // Nasłuchiwanie na status 'playing' gdy czekamy na gotowość przeciwnika
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

  // --- Auth ---
  async function handleAuth(uid: string, uname: string) {
    setUserId(uid)
    setUsername(uname)
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', uid).single()
    setIsAdmin(profile?.is_admin ?? false)
    setPhase('home')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUserId(null)
    setUsername('')
    setIsAdmin(false)
    setSession(null)
    placement.reset()
    setPhase('auth')
  }

  // --- Lobby callback – oboje gracze przechodzą do rozstawiania ---
  function handleGameReady(
    gameId: string, playerId: string, playerName: string,
    role: PlayerRole, opponentId: string,
  ) {
    setSession({ gameId, playerId, playerName, role, opponentId })
    placement.reset()
    setPhase('placement')
  }

  // --- GOTOWY: zapis planszy i uruchomienie gry ---
  async function handleReady(placed: PlacedShip[]) {
    // Tryb bota – bez Supabase, od razu do gry
    if (isBotGame) {
      setMyPlacedShips(placed)
      setPhase('bot')
      return
    }

    if (!session) return

    const { error: boardErr } = await supabase.from('boards').upsert({
      game_id:   session.gameId,
      player_id: session.playerId,
      ships:     placed,
      ready:     true,
    })
    if (boardErr) { console.error('[App] Błąd zapisu planszy:', boardErr); return }

    const { data: oppBoard } = await supabase
      .from('boards').select('ready')
      .eq('game_id', session.gameId)
      .eq('player_id', session.opponentId)
      .eq('ready', true)
      .maybeSingle()

    if (oppBoard) {
      const firstTurn = session.role === 'player1' ? session.playerId : session.opponentId
      await supabase.from('games')
        .update({ status: 'playing', current_turn: firstTurn })
        .eq('id', session.gameId)
      setPhase('playing')
    } else {
      setPhase('waiting_opponent')
    }
  }

  // --- AUTH ---
  if (phase === 'auth') {
    return <AuthPage onAuth={(uid, uname) => void handleAuth(uid, uname)} />
  }

  // --- PANEL ADMINA ---
  if (phase === 'admin') {
    return <AdminPanel onBack={() => setPhase('home')} />
  }

  // --- STRONA GŁÓWNA z rankingiem ---
  if (phase === 'home') {
    return (
      <HomePage
        username={username}
        isAdmin={isAdmin}
        onNewGame={() => { setIsBotGame(false); setPhase('lobby') }}
        onBotGame={(diff) => {
          setBotDifficulty(diff)
          setIsBotGame(true)
          placement.reset()
          setPhase('placement')
        }}
        onAdmin={() => setPhase('admin')}
        onSignOut={() => void handleSignOut()}
      />
    )
  }

  // --- LOBBY ---
  if (phase === 'lobby') {
    return (
      <Lobby
        userId={userId!}
        defaultName={username}
        onGameReady={handleGameReady}
        onBack={() => setPhase('home')}
      />
    )
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
            onReady={() => void handleReady(placement.placed)}
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

  // --- GRA Z BOTEM ---
  if (phase === 'bot') {
    return (
      <BotGameView
        myShips={myPlacedShips}
        difficulty={botDifficulty}
        myName={username}
        onBack={() => {
          setIsBotGame(false)
          placement.reset()
          setPhase('home')
        }}
      />
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
        setPhase('home')
      }}
    />
  )
}
