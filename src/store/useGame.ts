import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { FLEET, shipCells } from './boardStore'
import type { PlacedShip } from './boardStore'
import { checkAndAwardAchievements } from '../lib/achievements'
import type { AchievementDef } from '../lib/achievements'

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

// Ile statków w danej flocie zostało w pełni zatopionych
function countSunk(ships: PlacedShip[], hitsMap: Map<string, 'hit' | 'miss'>): number {
  return ships.filter(ship => {
    const def = FLEET.find(d => d.id === ship.defId)!
    return shipCells(ship, def.size).every(([r, c]) => hitsMap.get(`${r},${c}`) === 'hit')
  }).length
}

export function useGame(gameId: string, myId: string, opponentId: string) {
  const [currentTurn, setCurrentTurn] = useState<string | null>(null)
  const [gameStatus, setGameStatus]   = useState<string>('playing')
  const [winner, setWinner]           = useState<string | null>(null)
  const [winnerPoints, setWinnerPoints] = useState<number | null>(null)
  const [myShips, setMyShips]         = useState<PlacedShip[]>([])
  const [opponentShips, setOpponentShips] = useState<PlacedShip[]>([])
  const [shots, setShots]             = useState<Shot[]>([])
  const [loading, setLoading]         = useState(true)
  const [rematchGameId,    setRematchGameId]    = useState<string | null>(null)
  const [newAchievements,  setNewAchievements]  = useState<AchievementDef[]>([])

  // Załaduj pełny stan gry przy starcie
  const loadAll = useCallback(async () => {
    const [{ data: gameData }, { data: boardsData }, { data: shotsData }] = await Promise.all([
      supabase.from('games').select('current_turn,status,winner,winner_points,rematch_game_id').eq('id', gameId).single(),
      supabase.from('boards').select('player_id,ships').eq('game_id', gameId),
      supabase.from('shots').select('*').eq('game_id', gameId).order('created_at'),
    ])
    if (gameData) {
      setCurrentTurn(gameData.current_turn as string)
      setGameStatus(gameData.status as string)
      setWinner(gameData.winner as string | null)
      setWinnerPoints((gameData.winner_points as number | null) ?? null)
      if (gameData.rematch_game_id) setRematchGameId(gameData.rematch_game_id as string)
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
        const g = payload.new as { current_turn: string; status: string; winner: string | null; winner_points: number | null; rematch_game_id: string | null }
        setCurrentTurn(g.current_turn)
        setGameStatus(g.status)
        setWinner(g.winner)
        setWinnerPoints(g.winner_points ?? null)
        if (g.rematch_game_id) setRematchGameId(g.rematch_game_id)
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
      // Oblicz punkty: moje zatopione statki − zatopione przez przeciwnika
      const allShots = [...shots, { player_id: myId, row, col, result }]
      const myHitsMap  = new Map(allShots.filter(s => s.player_id === myId).map(s => [`${s.row},${s.col}`, s.result] as const))
      const oppHitsMap = new Map(allShots.filter(s => s.player_id === opponentId).map(s => [`${s.row},${s.col}`, s.result] as const))
      const mySunk  = countSunk(opponentShips, myHitsMap)
      const oppSunk = countSunk(myShips,       oppHitsMap)
      const points  = Math.max(1, mySunk - oppSunk)

      await supabase.from('games')
        .update({ status: 'finished', winner: myId, winner_points: points, current_turn: null })
        .eq('id', gameId)

      // Zaktualizuj rankingi przez funkcję bazy
      await supabase.rpc('update_player_scores', {
        p_winner_id: myId,
        p_loser_id:  opponentId,
        p_points:    points,
      })

      // Sprawdź odznaki
      const { data: prof } = await supabase
        .from('profiles')
        .select('games_won, games_played')
        .eq('id', myId).single()

      const allShots2 = [...shots, { player_id: myId, row, col, result }]
      const myShotsMap  = new Map(allShots2.filter(s => s.player_id === myId).map(s => [`${s.row},${s.col}`, s.result] as const))
      const oppShotsMap = new Map(allShots2.filter(s => s.player_id === opponentId).map(s => [`${s.row},${s.col}`, s.result] as const))

      const awarded = await checkAndAwardAchievements({
        gameId,
        myId,
        iWon:          true,
        myShots:       myShotsMap,
        opponentShots: oppShotsMap,
        myShips,
        gamesWon:      (prof?.games_won ?? 0),
        gamesPlayed:   (prof?.games_played ?? 0),
      })
      if (awarded.length > 0) setNewAchievements(awarded)
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

  // Zatopione statki: wszystkie pola statku trafione
  function getSunkCells(ships: PlacedShip[], hitsMap: Map<string, 'hit' | 'miss'>): Set<string> {
    const sunk = new Set<string>()
    for (const ship of ships) {
      const def = FLEET.find(d => d.id === ship.defId)!
      const cells = shipCells(ship, def.size)
      if (cells.every(([r, c]) => hitsMap.get(`${r},${c}`) === 'hit')) {
        cells.forEach(([r, c]) => sunk.add(`${r},${c}`))
      }
    }
    return sunk
  }

  // Pola zatopionych statków przeciwnika (moje trafienia)
  const sunkOpponentCells = getSunkCells(opponentShips, myShots)
  // Pola moich zatopionych statków (trafienia przeciwnika)
  const sunkMyCells = getSunkCells(myShips, opponentShots)

  // Liczba zatopionych statków (do wyświetlenia)
  const sunkOpponentCount = FLEET.reduce((acc, def) => {
    const count = opponentShips
      .filter(s => s.defId === def.id)
      .filter(ship => shipCells(ship, def.size).every(([r, c]) => myShots.get(`${r},${c}`) === 'hit'))
      .length
    return acc + count
  }, 0)

  const totalShots = shots.filter(s => s.player_id === myId).length

  // Proponuje rewanż: tworzy nową grę z odwróconymi rolami i zapisuje ID w starej grze
  async function proposeRematch(): Promise<{ newGameId: string } | null> {
    const { data, error } = await supabase
      .from('games')
      .insert({ player1_id: myId, player2_id: opponentId, status: 'placement' })
      .select('id').single()
    if (error || !data) return null
    const newId = data.id as string
    await supabase.from('games').update({ rematch_game_id: newId }).eq('id', gameId)
    setRematchGameId(newId)
    return { newGameId: newId }
  }

  return {
    loading, isMyTurn, gameStatus, winner, winnerPoints,
    myShips, opponentShips,
    myShots, opponentShots,
    sunkOpponentCells, sunkMyCells,
    sunkOpponentCount, totalShots,
    rematchGameId,
    newAchievements,
    shoot,
    proposeRematch,
  }
}
