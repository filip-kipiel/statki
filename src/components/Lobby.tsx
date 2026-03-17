import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getPlayerId, getPlayerName, savePlayerName, generateRoomCode } from '../lib/session'

export type PlayerRole = 'player1' | 'player2'

interface Props {
  onGameReady: (gameId: string, playerId: string, playerName: string, role: PlayerRole, opponentId: string) => void
}

export function Lobby({ onGameReady }: Props) {
  const [name, setName]           = useState(getPlayerName())
  const [joinCode, setJoinCode]   = useState('')
  const [roomCode, setRoomCode]   = useState<string | null>(null)
  const [gameId, setGameId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Refy zapobiegają przebudowie subskrypcji przy każdym renderze
  const nameRef        = useRef(name)
  const onReadyRef     = useRef(onGameReady)
  useEffect(() => { nameRef.current    = name },        [name])
  useEffect(() => { onReadyRef.current = onGameReady }, [onGameReady])

  // Nasłuchiwanie na dołączenie drugiego gracza – dual-track: Realtime + polling
  useEffect(() => {
    if (!gameId) return

    let done = false

    // Przejście wywoływane tylko raz (zabezpieczenie przed podwójnym wywołaniem)
    function transition(player2Id: string) {
      if (done) return
      done = true
      onReadyRef.current(gameId!, getPlayerId(), nameRef.current.trim(), 'player1', player2Id)
    }

    // Realtime – bez filtra (filtry UUID bywają zawodne), sprawdzamy id po stronie klienta
    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
      }, payload => {
        const g = payload.new as { id: string; status: string; player2_id: string }
        if (g.id === gameId && g.status === 'placement' && g.player2_id) {
          transition(g.player2_id)
        }
      })
      .subscribe()

    // Polling co 2s jako niezawodny fallback
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('games')
        .select('status, player2_id')
        .eq('id', gameId)
        .single()
      if (data?.status === 'placement' && data.player2_id) {
        transition(data.player2_id as string)
      }
    }, 2000)

    return () => {
      done = true
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function createGame() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Wpisz pseudonim'); return }
    setLoading(true)
    setError(null)
    savePlayerName(trimmed)

    const code     = generateRoomCode()
    const playerId = getPlayerId()

    const { data, error: err } = await supabase
      .from('games')
      .insert({ player1_id: playerId, status: 'waiting', code })
      .select('id')
      .single()

    if (err || !data) {
      setError('Nie udało się stworzyć gry – spróbuj ponownie')
      setLoading(false)
      return
    }

    setGameId(data.id as string)
    setRoomCode(code)
    setLoading(false)
  }

  async function joinGame() {
    const trimmed = name.trim()
    if (!trimmed)        { setError('Wpisz pseudonim'); return }
    if (!joinCode.trim()) { setError('Wpisz kod pokoju'); return }
    setLoading(true)
    setError(null)
    savePlayerName(trimmed)

    const code     = joinCode.trim().toUpperCase()
    const playerId = getPlayerId()

    // Znajdź oczekującą grę po kodzie
    const { data: game, error: findErr } = await supabase
      .from('games')
      .select('id, status, player1_id')
      .eq('code', code)
      .eq('status', 'waiting')
      .single()

    if (findErr || !game) {
      setError('Nie znaleziono gry – sprawdź kod i spróbuj ponownie')
      setLoading(false)
      return
    }

    // Dołącz do gry i uruchom fazę rozstawiania
    const { error: updateErr } = await supabase
      .from('games')
      .update({ player2_id: playerId, status: 'placement' })
      .eq('id', game.id)

    if (updateErr) {
      setError('Nie udało się dołączyć – spróbuj ponownie')
      setLoading(false)
      return
    }

    onGameReady(game.id as string, playerId, trimmed, 'player2', game.player1_id as string)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">

        {/* Nagłówek */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-wide mb-1">⚓ Statki</h1>
          <p className="text-gray-500 text-sm">Multiplayer</p>
        </div>

        {/* Pseudonim */}
        <div className="w-full">
          <label className="text-gray-400 text-xs uppercase tracking-wide mb-1.5 block">Pseudonim</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && createGame()}
            placeholder="np. Kapitan Nemo"
            maxLength={20}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-600 transition-colors"
          />
        </div>

        {/* Komunikat błędu */}
        {error && (
          <div className="w-full px-4 py-2 bg-red-950 border border-red-800 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!roomCode ? (
          <>
            {/* Stwórz grę */}
            <button
              onClick={createGame}
              disabled={loading}
              className="w-full px-4 py-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-900/30"
            >
              {loading ? 'Tworzenie...' : '+ STWÓRZ GRĘ'}
            </button>

            {/* Separator */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 border-t border-gray-800" />
              <span className="text-gray-600 text-sm">lub dołącz</span>
              <div className="flex-1 border-t border-gray-800" />
            </div>

            {/* Dołącz do gry */}
            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && joinGame()}
                placeholder="KOD"
                maxLength={6}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-green-500 placeholder-gray-600 uppercase tracking-[0.25em] font-mono text-center transition-colors"
              />
              <button
                onClick={joinGame}
                disabled={loading}
                className="px-5 py-3 bg-green-700 hover:bg-green-600 active:bg-green-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              >
                DOŁĄCZ
              </button>
            </div>
          </>
        ) : (
          /* Oczekiwanie na drugiego gracza */
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full p-6 bg-gray-900 border border-gray-700 rounded-xl text-center">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Kod pokoju</p>
              <p className="text-5xl font-mono font-bold text-white tracking-[0.4em]">{roomCode}</p>
              <p className="text-gray-600 text-xs mt-3">Podaj ten kod drugiemu graczowi</p>
            </div>

            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
              Czekam na drugiego gracza…
            </div>

            <button
              onClick={() => { setRoomCode(null); setGameId(null) }}
              className="text-gray-700 hover:text-gray-500 text-sm transition-colors"
            >
              Anuluj
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
