import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { FLEET, shipCells } from './boardStore'
import type { PlacedShip } from './boardStore'

export interface Shot {
  id: string
  game_id: string
  player_id: string
  row: number
  col: number
  result: 'hit' | 'miss'
}

// Łączna liczba pól zajętych przez flotę
const TOTAL_SHIP_CELLS = FLEET.reduce((sum, d) => sum + d.size * d.count, 0)

export function useGame(gameId: string, myId: string, opponentId: string) {
  const [currentTurn, setCurrentTurn] = useState<string | null>(null)
  const [gameStatus, setGameStatus]   = useState<string>('playing')
  const [winner, setWinner]           = useState<string | null>(null)
  const [myShips, setMyShips]         = useState<PlacedShip[]>([])
  const [opponentShips, setOpponentShips] = useState<PlacedShip[]>([])
  const [shots, setShots]             = useState<Shot[]>([])
  const [loading, setLoading]         = useState(true)

  // Załaduj pełny stan gry przy starcie
  const loadAll = useCallback(async () => {
    const [{ data: gameData }, { data: boardsData }, { data: shotsData }] = await Promise.all([
      supabase.from('games').select('current_turn,status,winner').eq('id', gameId).single(),
      supabase.from('boards').select('player_id,ships').eq('game_id', gameId),
      supabase.from('shots').select('*').eq('game_id', gameId).order('created_at'),
    ])
    if (gameData) {
      setCurrentTurn(gameData.current_turn as string)
      setGameStatus(gameData.status as string)
      setWinner(gameData.winner as string | null)
    }
    if (boardsData) {
      const mine = boardsData.find(b => b.player_id === myId)
      const opp  = boardsData.find(b => b.player_id === opponentId)
      if (mine) setMyShips(mine.ships as PlacedShip[])
      if (opp)  setOpponentShips(opp.ships as PlacedShip[])
    }
    if (shotsData) setShots(shotsData as Shot[])
    setLoading(false)
  }, [gameId, myId, opponentId])

  useEffect(() => { void loadAll() }, [loadAll])

  // Realtime – nowe strzały
  useEffect(() => {
    const ch = supabase
      .channel(`shots-game-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'shots',
        filter: `game_id=eq.${gameId}`,
      }, payload => {
        setShots(prev => [...prev, payload.new as Shot])
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [gameId])

  // Realtime – zmiana tury / statusu gry
  useEffect(() => {
    const ch = supabase
      .channel(`game-state-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games',
        filter: `id=eq.${gameId}`,
      }, payload => {
        const g = payload.new as { current_turn: string; status: string; winner: string | null }
        setCurrentTurn(g.current_turn)
        setGameStatus(g.status)
        setWinner(g.winner)
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [gameId])

  // Oddaj strzał
  async function shoot(row: number, col: number) {
    if (currentTurn !== myId) return
    if (gameStatus !== 'playing') return

    // Czy to pole już strzelane?
    const alreadyShot = shots.some(s => s.player_id === myId && s.row === row && s.col === col)
    if (alreadyShot) return

    // Sprawdź trafienie na podstawie plansz załadowanych przy starcie
    const isHit = opponentShips.some(ship => {
      const def = FLEET.find(d => d.id === ship.defId)!
      return shipCells(ship, def.size).some(([r, c]) => r === row && c === col)
    })
    const result: 'hit' | 'miss' = isHit ? 'hit' : 'miss'

    // Zapisz strzał do bazy
    const { error: shotErr } = await supabase
      .from('shots')
      .insert({ game_id: gameId, player_id: myId, row, col, result })
    if (shotErr) { console.error('[useGame] Błąd zapisu strzału:', shotErr); return }

    // Sprawdź koniec gry
    const myHitsAfter = shots.filter(s => s.player_id === myId && s.result === 'hit').length + (isHit ? 1 : 0)
    if (myHitsAfter >= TOTAL_SHIP_CELLS) {
      await supabase.from('games')
        .update({ status: 'finished', winner: myId, current_turn: null })
        .eq('id', gameId)
      return
    }

    // Pudło – przekaż turę
    if (result === 'miss') {
      await supabase.from('games')
        .update({ current_turn: opponentId })
        .eq('id', gameId)
    }
    // Trafienie – tura zostaje u mnie (brak update)
  }

  const isMyTurn = currentTurn === myId

  // Mapy strzałów: klucz `row,col` → wynik
  const myShots = new Map(
    shots.filter(s => s.player_id === myId).map(s => [`${s.row},${s.col}`, s.result] as const)
  )
  const opponentShots = new Map(
    shots.filter(s => s.player_id === opponentId).map(s => [`${s.row},${s.col}`, s.result] as const)
  )

  return {
    loading, isMyTurn, gameStatus, winner,
    myShips, opponentShips,
    myShots, opponentShots,
    shoot,
  }
}
