// Logika gry z botem – cały stan lokalnie, bez Supabase

import { useState, useEffect, useRef } from 'react'
import { FLEET, shipCells, generateRandomPlacement } from './boardStore'
import type { PlacedShip } from './boardStore'

export type BotDifficulty = 'easy' | 'medium' | 'hard'

export interface BotShot {
  row: number
  col: number
  result: 'hit' | 'miss'
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

function randomUnshot(alreadyShot: Set<string>): [number, number] {
  const available: [number, number][] = []
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 10; c++)
      if (!alreadyShot.has(`${r},${c}`)) available.push([r, c])
  return available[Math.floor(Math.random() * available.length)]
}

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

export function useBotGame(myShips: PlacedShip[], difficulty: BotDifficulty) {
  const [botShips]    = useState<PlacedShip[]>(() => generateRandomPlacement())
  const [isMyTurn,    setIsMyTurn]    = useState(true)
  const [gameStatus,  setGameStatus]  = useState<'playing' | 'finished'>('playing')
  const [winner,      setWinner]      = useState<'player' | 'bot' | null>(null)
  const [playerShots, setPlayerShots] = useState<BotShot[]>([])
  const [botShots,    setBotShots]    = useState<BotShot[]>([])

  // Licznik strzałów bota (do logiki trudności)
  const botShotCountRef = useRef(0)
  // Zbiory pól statków (stałe przez całą grę)
  const botShipCells = useRef(buildShipCellSet(botShips))
  const myShipCells  = useRef(buildShipCellSet(myShips))

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
    // Pudło → tura bota; trafienie → gracz strzela dalej
    if (result === 'miss') setIsMyTurn(false)
  }

  // Tura bota – odpala się gdy isMyTurn===false i gra trwa
  useEffect(() => {
    if (isMyTurn || gameStatus !== 'playing') return

    const timer = setTimeout(() => {
      botShotCountRef.current += 1
      const shotNum    = botShotCountRef.current
      const alreadyShot = new Set(botShots.map(s => `${s.row},${s.col}`))

      // Pewny strzał co 4-ty (medium) lub co 2-gi (hard)
      const isGuaranteedHit =
        (difficulty === 'hard'   && shotNum % 2 === 0) ||
        (difficulty === 'medium' && shotNum % 4 === 0)

      let row: number, col: number

      if (isGuaranteedHit) {
        const available = [...myShipCells.current]
          .filter(k => !alreadyShot.has(k))
          .map(k => k.split(',').map(Number) as [number, number])

        if (available.length > 0) {
          ;[row, col] = available[Math.floor(Math.random() * available.length)]
        } else {
          ;[row, col] = randomUnshot(alreadyShot)
        }
      } else {
        ;[row, col] = randomUnshot(alreadyShot)
      }

      const isHit  = myShipCells.current.has(`${row},${col}`)
      const result: 'hit' | 'miss' = isHit ? 'hit' : 'miss'
      const newBotShots = [...botShots, { row, col, result }]
      setBotShots(newBotShots)

      if (newBotShots.filter(s => s.result === 'hit').length >= TOTAL_SHIP_CELLS) {
        setGameStatus('finished')
        setWinner('bot')
      } else if (result === 'miss') {
        setIsMyTurn(true)
      }
      // Trafienie: isMyTurn zostaje false, botShots rośnie → effect ponownie
    }, 700)

    return () => clearTimeout(timer)
  }, [isMyTurn, gameStatus, botShots, difficulty])

  // Mapy strzałów
  const myShots      = new Map(playerShots.map(s => [`${s.row},${s.col}`, s.result] as const))
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
    isMyTurn,
    gameStatus,
    winner,
    myShips,
    botShips,
    myShots,
    opponentShots,
    sunkOpponentCells,
    sunkMyCells,
    sunkOpponentCount,
    totalShots: playerShots.length,
    shoot,
  }
}
