// Logika gry z botem – cały stan lokalnie, bez Supabase

import { useState, useEffect, useRef } from 'react'
import { FLEET, shipCells, generateRandomPlacement } from './boardStore'
import type { PlacedShip } from './boardStore'

export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'hunter'

export interface BotShot {
  row: number
  col: number
  result: 'hit' | 'miss'
}

// Stan AI w trybie hunter (hunt-and-target)
interface HunterState {
  mode: 'seek' | 'target'
  targetQueue: Array<[number, number]>
  pendingHits: Set<string>   // trafione pola niezatopionego jeszcze statku
}

const TOTAL_SHIP_CELLS = FLEET.reduce((sum, d) => sum + d.size * d.count, 0)

function buildShipCellSet(ships: PlacedShip[]): Set<string> {
  const s = new Set<string>()
  for (const ship of ships) {
    const def = FLEET.find(d => d.id === ship.defId)!
    for (const [r, c] of shipCells(ship, def.size)) s.add(`${r},${c}`)
  }
  return s
}

function getSunkCells(ships: PlacedShip[], hitsMap: Map<string, 'hit' | 'miss'>): Set<string> {
  const sunk = new Set<string>()
  for (const ship of ships) {
    const def   = FLEET.find(d => d.id === ship.defId)!
    const cells = shipCells(ship, def.size)
    if (cells.every(([r, c]) => hitsMap.get(`${r},${c}`) === 'hit')) {
      cells.forEach(([r, c]) => sunk.add(`${r},${c}`))
    }
  }
  return sunk
}

function randomUnshot(alreadyShot: Set<string>): [number, number] {
  const available: [number, number][] = []
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++)
      if (!alreadyShot.has(`${r},${c}`)) available.push([r, c])
  return available[Math.floor(Math.random() * available.length)]
}

// Sąsiednie pola w granicach planszy, niezestrzelone
function neighbors(r: number, c: number, alreadyShot: Set<string>): Array<[number, number]> {
  return ([[r-1,c],[r+1,c],[r,c-1],[r,c+1]] as Array<[number,number]>)
    .filter(([nr, nc]) => nr >= 0 && nr < 10 && nc >= 0 && nc < 10 && !alreadyShot.has(`${nr},${nc}`))
}

// Wyznacza cel dla bota hunter na podstawie bieżącego stanu
function hunterPick(
  state: HunterState,
  alreadyShot: Set<string>,
): [number, number] {
  // Usuń z kolejki pola już zestrzelone
  state.targetQueue = state.targetQueue.filter(([r,c]) => !alreadyShot.has(`${r},${c}`))

  if (state.mode === 'target' && state.targetQueue.length > 0) {
    return state.targetQueue.shift()!
  }
  state.mode = 'seek'
  return randomUnshot(alreadyShot)
}

// Aktualizuje stan AI po oddanym strzale
function hunterUpdate(
  state: HunterState,
  row: number, col: number,
  result: 'hit' | 'miss',
  alreadyShot: Set<string>,   // zestaw po dodaniu obecnego strzału
  myShips: PlacedShip[],
  allBotShots: BotShot[],
) {
  if (result === 'miss') return

  state.mode = 'target'
  state.pendingHits.add(`${row},${col}`)

  // Sprawdź czy właśnie zatopiliśmy statek
  const hitsMap = new Map(allBotShots.filter(s => s.result === 'hit').map(s => [`${s.row},${s.col}`, 'hit' as const]))
  const sunk    = getSunkCells(myShips, hitsMap)
  // Usuń zatopione pola z pendingHits
  for (const key of [...state.pendingHits]) {
    if (sunk.has(key)) state.pendingHits.delete(key)
  }
  if (state.pendingHits.size === 0) {
    // Statek zatopiony – wróć do seekowania
    state.mode = 'seek'
    state.targetQueue = []
    return
  }

  // Buduj kolejkę celów na podstawie wzajemnego ułożenia trafień
  const hits = [...state.pendingHits].map(k => k.split(',').map(Number) as [number, number])
  let newTargets: Array<[number, number]>

  if (hits.length === 1) {
    newTargets = neighbors(hits[0][0], hits[0][1], alreadyShot)
  } else {
    const rows = hits.map(([r]) => r)
    const cols = hits.map(([,c]) => c)
    if (rows.every(r => r === rows[0])) {
      // poziomo – rozszerzaj lewo/prawo
      const minC = Math.min(...cols), maxC = Math.max(...cols)
      newTargets = ([[rows[0], minC-1], [rows[0], maxC+1]] as Array<[number,number]>)
        .filter(([r,c]) => r >= 0 && r < 10 && c >= 0 && c < 10 && !alreadyShot.has(`${r},${c}`))
    } else {
      // pionowo – rozszerzaj góra/dół
      const minR = Math.min(...rows), maxR = Math.max(...rows)
      newTargets = ([[minR-1, cols[0]], [maxR+1, cols[0]]] as Array<[number,number]>)
        .filter(([r,c]) => r >= 0 && r < 10 && c >= 0 && c < 10 && !alreadyShot.has(`${r},${c}`))
    }
  }
  // Nowe cele na początek kolejki (priorytet kierunku)
  const existing = state.targetQueue.filter(([r,c]) => !newTargets.some(([nr,nc]) => nr===r && nc===c))
  state.targetQueue = [...newTargets, ...existing]
}

export function useBotGame(myShips: PlacedShip[], difficulty: BotDifficulty) {
  const [botShips]    = useState<PlacedShip[]>(() => generateRandomPlacement())
  const [isMyTurn,    setIsMyTurn]    = useState(true)
  const [gameStatus,  setGameStatus]  = useState<'playing' | 'finished'>('playing')
  const [winner,      setWinner]      = useState<'player' | 'bot' | null>(null)
  const [playerShots, setPlayerShots] = useState<BotShot[]>([])
  const [botShots,    setBotShots]    = useState<BotShot[]>([])

  const botShotCountRef = useRef(0)
  const botShipCells    = useRef(buildShipCellSet(botShips))
  const myShipCells     = useRef(buildShipCellSet(myShips))
  // Stan AI dla trybu hunter (mutowany in-place)
  const hunterState = useRef<HunterState>({ mode: 'seek', targetQueue: [], pendingHits: new Set() })

  // Strzał gracza
  function shoot(row: number, col: number) {
    if (!isMyTurn || gameStatus !== 'playing') return
    if (playerShots.some(s => s.row === row && s.col === col)) return

    const isHit = botShipCells.current.has(`${row},${col}`)
    const result: 'hit' | 'miss' = isHit ? 'hit' : 'miss'
    const newShots = [...playerShots, { row, col, result }]
    setPlayerShots(newShots)

    if (newShots.filter(s => s.result === 'hit').length >= TOTAL_SHIP_CELLS) {
      setGameStatus('finished')
      setWinner('player')
      return
    }
    if (result === 'miss') setIsMyTurn(false)
  }

  // Tura bota
  useEffect(() => {
    if (isMyTurn || gameStatus !== 'playing') return

    const timer = setTimeout(() => {
      botShotCountRef.current += 1
      const shotNum     = botShotCountRef.current
      const alreadyShot = new Set(botShots.map(s => `${s.row},${s.col}`))

      let row: number, col: number

      if (difficulty === 'hunter') {
        ;[row, col] = hunterPick(hunterState.current, alreadyShot)
      } else {
        const isGuaranteedHit =
          (difficulty === 'hard'   && shotNum % 2 === 0) ||
          (difficulty === 'medium' && shotNum % 4 === 0)

        if (isGuaranteedHit) {
          const available = [...myShipCells.current]
            .filter(k => !alreadyShot.has(k))
            .map(k => k.split(',').map(Number) as [number, number])
          ;[row, col] = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : randomUnshot(alreadyShot)
        } else {
          ;[row, col] = randomUnshot(alreadyShot)
        }
      }

      const isHit  = myShipCells.current.has(`${row},${col}`)
      const result: 'hit' | 'miss' = isHit ? 'hit' : 'miss'
      const newBotShots = [...botShots, { row, col, result }]

      if (difficulty === 'hunter') {
        const shotAlreadyWithNew = new Set([...alreadyShot, `${row},${col}`])
        hunterUpdate(hunterState.current, row, col, result, shotAlreadyWithNew, myShips, newBotShots)
      }

      setBotShots(newBotShots)

      if (newBotShots.filter(s => s.result === 'hit').length >= TOTAL_SHIP_CELLS) {
        setGameStatus('finished')
        setWinner('bot')
      } else if (result === 'miss') {
        setIsMyTurn(true)
      }
    }, 700)

    return () => clearTimeout(timer)
  }, [isMyTurn, gameStatus, botShots, difficulty])

  // Mapy strzałów
  const myShots       = new Map(playerShots.map(s => [`${s.row},${s.col}`, s.result] as const))
  const opponentShots = new Map(botShots.map(s => [`${s.row},${s.col}`, s.result] as const))

  const sunkOpponentCells = getSunkCells(botShips, myShots)
  const sunkMyCells       = getSunkCells(myShips,  opponentShots)

  const sunkOpponentCount = FLEET.reduce((acc, def) =>
    acc + botShips
      .filter(s => s.defId === def.id)
      .filter(ship => shipCells(ship, def.size).every(([r, c]) => myShots.get(`${r},${c}`) === 'hit'))
      .length,
  0)

  return {
    isMyTurn, gameStatus, winner,
    myShips, botShips,
    myShots, opponentShots,
    sunkOpponentCells, sunkMyCells,
    sunkOpponentCount,
    totalShots: playerShots.length,
    shoot,
  }
}
